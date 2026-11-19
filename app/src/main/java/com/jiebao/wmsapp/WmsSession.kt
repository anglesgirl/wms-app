package com.jiebao.wmsapp

import android.content.Context

/**
 * WMS session: login, token storage, META01 screen fetch, EXEC submit.
 *
 * All protocol facts are verified against the real ws.log (PROTOCOL.md):
 * - Login: EXEC NSPRFMETAOT08, appFlag "OT08", warehouse empty, locale zh-CN,
 *   business params (locale, password, WEBRF, INFOR). The OT,01 reply's first
 *   data value is the session token (base64); the trailing section carries
 *   the warehouse (INFOR_WM_wmwhse2) and its display name.
 * - Reconnect: EXEC NSPRFWEBRFOT08, appFlag "OT08", business params
 *   (en, "", WEBRF, INFOR, token). No password needed.
 * - META01: EXEC NSPRFMETA01, business params (screen, NSD, 16x20, zh_CN).
 * - Normal submit: proc from the screen def HEADER index 7 (or derived),
 *   appFlag = proc minus "NSPRF", split into (all but last 2 chars, last 2).
 *   Business params = SEND field values in seq order.
 * - The header's 3rd value is a fresh random 6-digit id per request
 *   (framework generateID()); it is NOT a stable session id — the WebSocket
 *   connection itself carries the session after login.
 *
 * Passwords are never stored. The token lives only in SharedPreferences.
 * Callbacks arrive on OkHttp's background thread; callers must switch to
 * the main thread for UI work.
 */
class WmsSession(context: Context, private val protocol: WmsProtocol) {

    companion object {
        const val PREFS = "wms_session"
        const val KEY_USER_ID = "user_id"
        const val KEY_WAREHOUSE = "warehouse"
        const val KEY_TOKEN = "token"
        const val HOST = WmsResponseParser.HOST
        const val TENANT = "INFOR"
    }

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var userId: String = prefs.getString(KEY_USER_ID, "") ?: ""
        private set
    var warehouse: String = prefs.getString(KEY_WAREHOUSE, "") ?: ""
        private set
    var token: String? = prefs.getString(KEY_TOKEN, null)
        private set

    fun hasToken(): Boolean = !token.isNullOrEmpty()

    fun clearToken() {
        token = null
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    // ------------------------------------------------------------------
    // Header / EXEC construction
    // ------------------------------------------------------------------

    /** Split a proc's appFlag ("IQ01", "STDPK11X") into (screen, step). */
    fun splitAppFlag(procName: String): Pair<String, String> {
        var flag = procName
        if (flag.startsWith("NSPRF")) flag = flag.substring("NSPRF".length)
        return if (flag.length >= 4) {
            flag.substring(0, flag.length - 2) to flag.substring(flag.length - 2)
        } else {
            flag to "01"
        }
    }

    /**
     * Build the EXEC parameter string (header + business params).
     * Every value is encodeURIComponent'd, comma-joined, trailing comma.
     * [appFlag] is the full proc suffix ("IQ01") or an explicit override
     * ("OT08" for login/reconnect); it is split into (screen, step).
     */
    fun buildParams(
        procName: String,
        appFlagOverride: String?,
        business: List<String>
    ): String {
        val flag = appFlagOverride ?: run {
            var f = procName
            if (f.startsWith("NSPRF")) f = f.substring("NSPRF".length)
            f
        }
        val (screen, step) = splitAppFlag("NSPRF$flag")
        val header = listOf(
            "1", userId, protocol.nextId(), warehouse, TENANT, screen, step, HOST
        )
        val sb = StringBuilder()
        for (v in header) sb.append(WmsCodec.encode(v)).append(',')
        for (v in business) sb.append(WmsCodec.encode(v)).append(',')
        return sb.toString()
    }

    /** Send an EXEC and parse the reply into a [WmsResponse]. */
    fun exec(
        procName: String,
        appFlagOverride: String?,
        business: List<String>,
        onResponse: (WmsResponse) -> Unit
    ) {
        val params = buildParams(procName, appFlagOverride, business)
        protocol.send("EXEC $procName  $params") { raw ->
            onResponse(WmsResponseParser.parse(raw))
        }
    }

    // ------------------------------------------------------------------
    // Login / reconnect
    // ------------------------------------------------------------------

    /**
     * First login. [user] is lower-cased like the framework does.
     * On success the token + warehouse are saved; [onResult] gets (ok, error?).
     */
    fun login(user: String, password: String, onResult: (Boolean, String?) -> Unit) {
        userId = user.trim().lowercase()
        prefs.edit().putString(KEY_USER_ID, userId).apply()
        val business = listOf("zh-CN", password, "WEBRF", TENANT)
        // Login EXEC has an empty warehouse: build the params manually.
        val savedWarehouse = warehouse
        warehouse = ""
        val params = buildParams("NSPRFMETAOT08", "OT08", business)
        warehouse = savedWarehouse
        protocol.send("EXEC NSPRFMETAOT08  $params") { raw ->
            when (val r = WmsResponseParser.parse(raw)) {
                is WmsResponse.Error -> onResult(false, r.message)
                is WmsResponse.Data -> {
                    val parsed = parseLoginData(r)
                    if (parsed == null) {
                        onResult(false, "登录返回无法解析")
                    } else {
                        token = parsed.first
                        warehouse = parsed.second
                        prefs.edit()
                            .putString(KEY_TOKEN, token)
                            .putString(KEY_WAREHOUSE, warehouse)
                            .apply()
                        onResult(true, null)
                    }
                }
                else -> onResult(false, "登录返回异常")
            }
        }
    }

    /** Reconnect with the saved token (no password). */
    fun reconnect(onResult: (Boolean, String?) -> Unit) {
        val t = token
        if (t.isNullOrEmpty()) {
            onResult(false, "无会话令牌，请重新登录")
            return
        }
        val business = listOf("en", "", "WEBRF", TENANT, t)
        exec("NSPRFWEBRFOT08", "OT08", business) { r ->
            when (r) {
                is WmsResponse.Error -> {
                    if (r.message.contains("NO SESSION")) {
                        clearToken()
                        onResult(false, "会话已失效，请重新登录")
                    } else {
                        onResult(false, r.message)
                    }
                }
                else -> onResult(true, null)
            }
        }
    }

    /**
     * Parse the login OT,01 payload.
     * First data value = token; the trailing \u000C section carries the warehouse
     * (",INFOR_WM_wmwhse2,INFOR_WM_wmwhse2,奔图电子成品仓").
     * Returns (token, warehouse) or null when the shape is unexpected.
     */
    fun parseLoginData(data: WmsResponse.Data): Pair<String, String>? {
        val rows = data.rows
        if (rows.isEmpty()) return null
        val first = rows[0]
        if (first.isEmpty() || first[0].isEmpty()) return null
        val tok = first[0]
        // Warehouse: scan the row sections for a value starting with INFOR_WM_.
        for (row in rows) {
            for (v in row) {
                if (v.startsWith("INFOR_WM_")) return tok to v
            }
        }
        // TODO: warehouse not found in the login reply — the server may return
        // it under a different shape. Surface it instead of guessing.
        return null
    }

    // ------------------------------------------------------------------
    // Screens
    // ------------------------------------------------------------------

    private val screenCache = HashMap<String, ScreenDef>()

    /** META01 fetch (in-memory cache, like the framework's screen cache). */
    fun fetchScreen(screenName: String, onResult: (ScreenDef?) -> Unit) {
        screenCache[screenName]?.let {
            onResult(it)
            return
        }
        exec("NSPRFMETA01", null, listOf(screenName, "NSD", "16x20", "zh_CN")) { r ->
            when (r) {
                is WmsResponse.Screen -> {
                    if (r.defText.isEmpty()) {
                        onResult(null)
                    } else {
                        val def = ScreenDefParser.parse(screenName, r.defText)
                        screenCache[screenName] = def
                        onResult(def)
                    }
                }
                else -> onResult(null)
            }
        }
    }

    /** Submit a screen: EXEC with the screen's proc and its SEND values in seq order. */
    fun submitScreen(
        def: ScreenDef,
        values: Map<String, String>,
        onResponse: (WmsResponse) -> Unit
    ) {
        val params = ScreenDefParser.buildExecParams(def.sendFields, values)
        val proc = def.effectiveProcName()
        val (screen, step) = splitAppFlag(proc)
        val header = listOf(
            "1", userId, protocol.nextId(), warehouse, TENANT, screen, step, HOST
        )
        val sb = StringBuilder()
        for (v in header) sb.append(WmsCodec.encode(v)).append(',')
        sb.append(params)
        protocol.send("EXEC $proc  $sb") { raw ->
            onResponse(WmsResponseParser.parse(raw))
        }
    }
}
