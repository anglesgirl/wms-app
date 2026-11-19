package com.jiebao.wmsapp

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Native WMS client. No WebView, no address bar — the server address is
 * fixed (wss://wms.pantum.com:443/wm_webrf) and screens are rendered from
 * the server's META01 definitions.
 *
 * Flow: login (NSPRFMETAOT08, or reconnect NSPRFWEBRFOT08 with the saved
 * token) -> M2 main menu -> menus/forms. After a successful submit the next
 * screen comes from the def's SETSCREEN / resultScreen, or the server reply.
 *
 * PDA notes: the scan gun sends key events into the focused EditText
 * (scanner = keyboard). The screen is kept on. F1 = submit, F2 = lookup
 * (only when the focused SEND field has a LKUP), F4 = back.
 *
 * Field types (index 1): 0=label, 1=input, 2=choice, 3=multi, 4=date.
 * Type 2 (choice) has no option list in the def, so it renders as an
 * editable text field like type 1 (TODO: find the options source).
 *
 * TODOs (need the live device / missing defs to confirm):
 * - STDPK2's def is not in any captured log, so its field names are matched
 *   by label heuristics ("库位/箱", "序列号") — confirm on device.
 * - SNL01's def, query EXEC shape and result columns are not in any log —
 *   the serial-query flow is built on the IQ01/IQ02 pattern and the
 *   column pick is a heuristic (name contains "sn"/"序列号", else first
 *   non-empty value). Confirm on device.
 * - Multi-serial fill-back is comma-joined into the serial field; whether
 *   the server accepts that (vs one serial per submit) needs a device test.
 * - F4 is mapped to "back" here; the framework's per-screen F4 binding is
 *   not yet mapped.
 */
class MainActivity : Activity(), WmsProtocol.Listener {

    private lateinit var protocol: WmsProtocol
    private lateinit var session: WmsSession

    private lateinit var content: LinearLayout
    private lateinit var errorView: TextView
    private lateinit var btnF1: Button
    private lateinit var btnF2: Button
    private lateinit var btnF4: Button

    private var currentDef: ScreenDef? = null
    private val fieldInputs = HashMap<String, EditText>()
    private val fieldValues = HashMap<String, String>()
    private var focusedField: ScreenField? = null
    private var pendingRows: List<List<String>> = emptyList()
    private var selectedRow: Int = -1

    /** Back stack: (screen name, saved SEND values, result rows). */
    private val screenStack = ArrayDeque<ScreenState>()

    private data class ScreenState(
        val name: String,
        val values: Map<String, String>,
        val rows: List<List<String>> = emptyList()
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        protocol = WmsProtocol(this)
        session = WmsSession(this, protocol)
        buildShell()
        showConnecting()
        protocol.connect()
    }

    override fun onDestroy() {
        protocol.disconnect()
        super.onDestroy()
    }

    // ------------------------------------------------------------------
    // Shell layout
    // ------------------------------------------------------------------

    private fun buildShell() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
        }
        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
            )
        }
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }
        scroll.addView(content)
        root.addView(scroll)

        errorView = TextView(this).apply {
            setTextColor(0xFFFF4444.toInt())
            textSize = 16f
            setPadding(24, 8, 24, 8)
            visibility = View.GONE
        }
        root.addView(errorView)

        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(8, 8, 8, 8)
        }
        btnF1 = Button(this).apply {
            text = "F1 提交"
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            setOnClickListener { submitCurrent() }
        }
        btnF2 = Button(this).apply {
            text = "F2 查找"
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            setOnClickListener { lookupFocused() }
        }
        btnF4 = Button(this).apply {
            text = "F4 返回"
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            setOnClickListener { goBack() }
        }
        bar.addView(btnF1)
        bar.addView(btnF2)
        bar.addView(btnF4)
        root.addView(bar)
        setContentView(root)
    }

    private fun setBarVisible(visible: Boolean) {
        val v = if (visible) View.VISIBLE else View.GONE
        btnF1.visibility = v
        btnF2.visibility = v
        btnF4.visibility = v
    }

    private fun showError(msg: String?) {
        if (msg.isNullOrEmpty()) {
            errorView.visibility = View.GONE
        } else {
            errorView.text = msg
            errorView.visibility = View.VISIBLE
        }
    }

    private fun showConnecting() {
        setBarVisible(false)
        content.removeAllViews()
        content.addView(TextView(this).apply {
            text = "正在连接 WMS 服务器…"
            textSize = 18f
            gravity = Gravity.CENTER
        })
    }

    // ------------------------------------------------------------------
    // WmsProtocol.Listener
    // ------------------------------------------------------------------

    override fun onReady() {
        runOnUiThread {
            if (session.hasToken()) {
                session.reconnect { ok, err ->
                    runOnUiThread {
                        if (ok) showScreen("M2") else showLogin(err)
                    }
                }
            } else {
                showLogin(null)
            }
        }
    }

    override fun onDisconnected() {
        runOnUiThread {
            showError("连接已断开，正在重连…")
        }
    }

    // ------------------------------------------------------------------
    // Login
    // ------------------------------------------------------------------

    private fun showLogin(prefillError: String?) {
        setBarVisible(false)
        currentDef = null
        content.removeAllViews()
        content.addView(TextView(this).apply {
            text = "WMS 登录"
            textSize = 22f
            setPadding(0, 16, 0, 24)
        })
        content.addView(TextView(this).apply {
            text = "服务器：wms.pantum.com:443（固定）"
            textSize = 14f
            setPadding(0, 0, 0, 24)
        })
        val userInput = EditText(this).apply {
            hint = "用户名"
            inputType = InputType.TYPE_CLASS_TEXT
            setText(session.userId)
        }
        val passInput = EditText(this).apply {
            hint = "密码"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            transformationMethod = PasswordTransformationMethod.getInstance()
            imeOptions = EditorInfo.IME_ACTION_GO
        }
        val loginBtn = Button(this).apply { text = "登录" }
        val loginError = TextView(this).apply {
            setTextColor(0xFFFF4444.toInt())
            textSize = 16f
            visibility = View.GONE
        }
        if (!prefillError.isNullOrEmpty()) {
            loginError.text = prefillError
            loginError.visibility = View.VISIBLE
        }
        fun doLogin() {
            val user = userInput.text.toString()
            val pass = passInput.text.toString()
            if (user.isBlank() || pass.isBlank()) {
                loginError.text = "请输入用户名和密码"
                loginError.visibility = View.VISIBLE
                return
            }
            loginBtn.isEnabled = false
            loginError.visibility = View.GONE
            session.login(user, pass) { ok, err ->
                runOnUiThread {
                    loginBtn.isEnabled = true
                    if (ok) {
                        showScreen("M2")
                    } else {
                        loginError.text = err ?: "登录失败"
                        loginError.visibility = View.VISIBLE
                    }
                }
            }
        }
        loginBtn.setOnClickListener { doLogin() }
        passInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO) {
                doLogin()
                true
            } else false
        }
        content.addView(labeled("用户名", userInput))
        content.addView(labeled("密码", passInput))
        content.addView(loginBtn)
        content.addView(loginError)
        userInput.requestFocus()
    }

    // ------------------------------------------------------------------
    // Screen loading / rendering
    // ------------------------------------------------------------------

    /** Load a screen by name (META01, cached) and render it. */
    private fun showScreen(name: String, rows: List<List<String>> = emptyList()) {
        setBarVisible(false)
        content.removeAllViews()
        content.addView(TextView(this).apply {
            text = "正在加载 $name…"
            textSize = 18f
        })
        session.fetchScreen(name) { def ->
            runOnUiThread {
                if (def == null) {
                    showError("取不到屏 $name，请重试")
                    goBack()
                    return@runOnUiThread
                }
                pendingRows = rows
                renderScreen(def)
            }
        }
    }

    private fun renderScreen(def: ScreenDef) {
        currentDef = def
        fieldInputs.clear()
        focusedField = null
        selectedRow = -1
        showError(null)
        content.removeAllViews()
        content.addView(TextView(this).apply {
            text = def.title
            textSize = 22f
            setPadding(0, 8, 0, 16)
        })

        if (def.isMenu) {
            renderMenu(def)
        } else {
            renderForm(def)
        }
        if (def.screenName == "STDPK2") renderSerialQueryButton()
        setBarVisible(true)
        updateF2State()
    }

    /** Menu screen: every SEND item is a big button; the item name is the target screen. */
    private fun renderMenu(def: ScreenDef) {
        for (field in def.sendFields) {
            val btn = Button(this).apply {
                text = field.label.ifEmpty { field.name }
                textSize = 18f
                setPadding(0, 20, 0, 20)
                setOnClickListener {
                    pushState()
                    showScreen(field.name)
                }
            }
            content.addView(btn)
        }
        if (def.sendFields.isEmpty()) {
            content.addView(TextView(this).apply { text = "（空菜单）" })
        }
    }

    /** Form screen: RECEIVE read-only, SEND editable, then the result list. */
    private fun renderForm(def: ScreenDef) {
        for (field in def.receiveFields) {
            val value = fieldValues[field.name] ?: field.value
            content.addView(labeled(field.label, TextView(this).apply {
                text = value
                textSize = 18f
            }))
        }
        for (field in def.displayFields) {
            val value = fieldValues[field.name] ?: field.value
            if (value.isNotEmpty()) {
                content.addView(labeled(field.label, TextView(this).apply {
                    text = value
                    textSize = 18f
                }))
            }
        }
        for (field in def.sendFields) {
            content.addView(buildSendField(def, field))
        }
        if (pendingRows.isNotEmpty()) renderResultList(def)
    }

    /** Result rows (query / selector screens): single-select list. */
    private fun renderResultList(def: ScreenDef) {
        content.addView(TextView(this).apply {
            text = "结果（${pendingRows.size} 行）"
            textSize = 16f
            setPadding(0, 16, 0, 8)
        })
        val items = pendingRows.map { row -> row.filter { it.isNotEmpty() }.joinToString(" | ") }
        val list = ListView(this).apply {
            adapter = ArrayAdapter(
                this@MainActivity,
                android.R.layout.simple_list_item_single_choice, items
            )
            choiceMode = ListView.CHOICE_MODE_SINGLE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnItemClickListener { _, _, position, _ ->
                selectedRow = position
                updateF2State()
            }
        }
        content.addView(list)
        if (def.isSelector) {
            content.addView(TextView(this).apply {
                text = "点一行选中，再按 F1 提交。"
                textSize = 14f
                setPadding(0, 8, 0, 0)
            })
        }
    }

    /** One SEND field: label + EditText (type 0 label fields are read-only). */
    private fun buildSendField(def: ScreenDef, field: ScreenField): View {
        val label = field.label + if (field.isRequired) " *" else ""
        // Seed the value (def value, or the restored value from back-nav).
        if (!fieldValues.containsKey(field.name)) {
            fieldValues[field.name] = field.value
        }
        if (field.type == 0) {
            // Label field: read-only, but its value is still submitted.
            return labeled(label, TextView(this).apply {
                text = fieldValues[field.name].orEmpty()
                textSize = 18f
            })
        }
        val edit = EditText(this).apply {
            hint = field.label
            inputType = InputType.TYPE_CLASS_TEXT
            setText(fieldValues[field.name].orEmpty())
            if (field.forceUpper) {
                filters = arrayOf(InputFilter.AllCaps())
            }
            if (field.maxLength > 0) {
                val cur = filters.toList()
                filters = (cur + InputFilter.LengthFilter(field.maxLength)).toTypedArray()
            }
            onFocusChangeListener = View.OnFocusChangeListener { _, hasFocus ->
                if (hasFocus) {
                    focusedField = field
                    updateF2State()
                }
            }
            setOnEditorActionListener { _, actionId, event ->
                val enter = actionId == EditorInfo.IME_ACTION_DONE ||
                    actionId == EditorInfo.IME_ACTION_NEXT ||
                    (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER &&
                        event.action == KeyEvent.ACTION_DOWN)
                if (enter) {
                    if (def.autoEnter) submitCurrent() else focusNextField(field)
                    true
                } else false
            }
            // Scanner Enter key (hardware key event, not IME).
            setOnKeyListener { _, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN) {
                    if (def.autoEnter) submitCurrent() else focusNextField(field)
                    true
                } else false
            }
        }
        fieldInputs[field.name] = edit
        return labeled(label, edit)
    }

    private fun labeled(label: String, view: View): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 8, 0, 8)
            addView(TextView(this@MainActivity).apply {
                text = label
                textSize = 16f
            })
            addView(view)
        }
    }

    private fun focusNextField(current: ScreenField) {
        val sends = currentDef?.sendFields ?: return
        val idx = sends.indexOfFirst { it.name == current.name }
        val next = sends.getOrNull(idx + 1)
        if (next != null) {
            fieldInputs[next.name]?.requestFocus()
        }
    }

    private fun updateF2State() {
        val f = focusedField
        btnF2.isEnabled = f != null && f.lkup.isNotBlank()
    }

    // ------------------------------------------------------------------
    // Submit / navigation
    // ------------------------------------------------------------------

    /** Current SEND values: EditText text for editable fields, seeded value otherwise. */
    private fun collectValues(): Map<String, String> {
        val out = HashMap<String, String>()
        val def = currentDef
        if (def != null) {
            for (f in def.sendFields) {
                out[f.name] = fieldInputs[f.name]?.text?.toString()
                    ?: fieldValues[f.name]
                    ?: f.value
            }
        }
        return out
    }

    private fun submitCurrent() {
        val def = currentDef ?: return
        if (def.isMenu) return
        // Selector screen: a row must be chosen; its value goes into the
        // selector SEND field before submit.
        if (def.isSelector && pendingRows.isNotEmpty()) {
            if (selectedRow < 0) {
                showError("请先点一行选中")
                return
            }
            val selector = def.sendFields.firstOrNull { it.name == "selector" }
            if (selector != null) {
                val value = pickRowValue(def, pendingRows[selectedRow])
                fieldInputs["selector"]?.setText(value)
            }
        }
        val values = collectValues()
        // Required check (client-side; the server re-checks).
        val missing = def.sendFields.firstOrNull {
            it.isRequired && values[it.name].isNullOrBlank()
        }
        if (missing != null) {
            showError("请填写：${missing.label}")
            return
        }
        if (def.noXmit) {
            // NOXMIT screen: no EXEC, just move on.
            navigateAfterSubmit(def, null)
            return
        }
        btnF1.isEnabled = false
        session.submitScreen(def, values) { resp ->
            runOnUiThread {
                btnF1.isEnabled = true
                when (resp) {
                    is WmsResponse.Error -> {
                        if (resp.message.contains("NO SESSION")) {
                            session.clearToken()
                            showLogin("会话已失效，请重新登录")
                        } else {
                            showError(resp.message)
                        }
                    }
                    is WmsResponse.Data -> handleDataAfterSubmit(def, resp.rows)
                    is WmsResponse.Data2 -> {
                        // TODO: OT,02 after STDPK22X means "go to STDPK23X".
                        // Verified only on 2 data points; treat like OT,01
                        // and let the def's nextScreen decide.
                        handleDataAfterSubmit(def, resp.rows)
                    }
                    is WmsResponse.Screen -> {
                        if (resp.defText.isEmpty()) {
                            // OT,03 count 0 = finished (e.g. after STDPKFTH).
                            Toast.makeText(this, "完成", Toast.LENGTH_SHORT).show()
                            goBack()
                        } else {
                            val next = ScreenDefParser.parse(def.screenName, resp.defText)
                            pushState()
                            renderScreen(next)
                        }
                    }
                    is WmsResponse.Empty -> showError("无响应，请重试")
                }
            }
        }
    }

    /** After a successful OT,01/OT,02: rows = query result or a plain ack. */
    private fun handleDataAfterSubmit(def: ScreenDef, rows: List<List<String>>) {
        val nonEmpty = rows.filter { row -> row.any { it.isNotEmpty() } }
        val resultScreen = def.resultScreen
        if (nonEmpty.isNotEmpty() && resultScreen != null) {
            // Query result -> render on the result screen with the rows.
            pushState()
            showScreen(resultScreen, nonEmpty)
            return
        }
        if (nonEmpty.isNotEmpty() && def.isSelector) {
            // Already on a result screen and got fresh rows: re-render list.
            pendingRows = nonEmpty
            renderScreen(def)
            return
        }
        navigateAfterSubmit(def, nonEmpty)
    }

    private fun navigateAfterSubmit(def: ScreenDef, rows: List<List<String>>?) {
        val next = def.nextScreen
        if (next != null) {
            pushState()
            showScreen(next)
        } else if (rows != null && rows.isNotEmpty()) {
            // Data returned but no next screen: show the rows in place.
            pendingRows = rows
            renderScreen(def)
        } else {
            // Plain ack: stay on the screen, clear inputs for the next scan.
            fieldValues.clear()
            for ((_, edit) in fieldInputs) edit.setText("")
            showError(null)
            Toast.makeText(this, "已提交", Toast.LENGTH_SHORT).show()
        }
    }

    /** Pick the value to submit for a selector row: the column whose field
     * name contains "sn"/"序列号" wins, else the first non-empty value.
     * TODO: the SNL01/IQ02 column mapping is unverified (result columns do
     * not line up 1:1 with the result screen's RECEIVE fields). */
    private fun pickRowValue(def: ScreenDef, row: List<String>): String {
        val cols = def.receiveFields + def.displayFields
        for ((i, v) in row.withIndex()) {
            if (v.isEmpty()) continue
            val col = cols.getOrNull(i)
            val n = (col?.name ?: "") + (col?.label ?: "")
            if (n.contains("sn", true) || n.contains("序列号")) return v
        }
        return row.firstOrNull { it.isNotEmpty() }.orEmpty()
    }

    private fun pushState() {
        val def = currentDef ?: return
        screenStack.addLast(
            ScreenState(def.screenName, collectValues(), pendingRows)
        )
    }

    private fun goBack() {
        val prev = screenStack.removeLastOrNull()
        if (prev == null) {
            // At the top: back to the main menu (or finish on the login).
            if (currentDef?.screenName == "M2") finish() else showScreen("M2")
            return
        }
        fieldValues.clear()
        fieldValues.putAll(prev.values)
        showScreen(prev.name, prev.rows)
    }

    override fun onBackPressed() {
        goBack()
    }

    // ------------------------------------------------------------------
    // F2 lookup
    // ------------------------------------------------------------------

    private fun lookupFocused() {
        val field = focusedField ?: return
        val lkup = field.lkup
        if (lkup.isBlank()) return
        // LKUP is a screen name (may carry a step suffix, e.g. "STDPK11X-1",
        // "RTXRECHECK1-X" — META01 accepts the full string).
        pushState()
        showScreen(lkup)
    }

    // ------------------------------------------------------------------
    // Serial query (STDPK2 "查序列号")
    // ------------------------------------------------------------------

    /** Button shown only on the STDPK2 screen. */
    private fun renderSerialQueryButton() {
        content.addView(Button(this).apply {
            text = "查序列号"
            textSize = 18f
            setPadding(0, 20, 0, 20)
            setOnClickListener { openSerialQuery() }
        })
    }

    /**
     * Open SNL01 pre-filled with the current loc + sku, show the result as
     * a multi-select list, and fill the chosen serials back into the
     * STDPK2 serial field. No screen switching, no copy-paste.
     */
    private fun openSerialQuery() {
        val def = currentDef ?: return
        val values = collectValues()
        val loc = findValueByHint(def, values, listOf("loc", "库位"))
        val sku = findValueByHint(def, values, listOf("sku", "物料", "货品"))
        if (loc.isNullOrBlank() && sku.isNullOrBlank()) {
            showError("请先输入库位和物料")
            return
        }
        setBarVisible(false)
        content.removeAllViews()
        content.addView(TextView(this).apply {
            text = "正在查询序列号…"
            textSize = 18f
        })
        session.fetchScreen("SNL01") { snl ->
            runOnUiThread {
                if (snl == null) {
                    showError("取不到序列号查询屏 SNL01")
                    renderScreen(def)
                    return@runOnUiThread
                }
                val query = HashMap<String, String>()
                for (f in snl.sendFields) {
                    val hint = (f.name + f.label).lowercase()
                    when {
                        hint.contains("loc") || hint.contains("库位") -> loc?.let { query[f.name] = it }
                        hint.contains("sku") || hint.contains("物料") || hint.contains("货品") ->
                            sku?.let { query[f.name] = it }
                    }
                }
                session.submitScreen(snl, query) { resp ->
                    runOnUiThread {
                        when (resp) {
                            is WmsResponse.Error -> {
                                showError(resp.message)
                                renderScreen(def)
                            }
                            is WmsResponse.Data, is WmsResponse.Data2 -> {
                                val rows = when (resp) {
                                    is WmsResponse.Data -> resp.rows
                                    is WmsResponse.Data2 -> resp.rows
                                    else -> emptyList()
                                }.filter { row -> row.any { it.isNotEmpty() } }
                                if (rows.isEmpty()) {
                                    showError("没有查到序列号")
                                    renderScreen(def)
                                } else {
                                    showSerialPicker(def, snl, rows)
                                }
                            }
                            else -> {
                                showError("查询无返回")
                                renderScreen(def)
                            }
                        }
                    }
                }
            }
        }
    }

    /** Multi-select list of serials; "填回" writes them into the STDPK2 serial field. */
    private fun showSerialPicker(
        pickingDef: ScreenDef,
        snlDef: ScreenDef,
        rows: List<List<String>>
    ) {
        val items = rows.map { row -> row.filter { it.isNotEmpty() }.joinToString(" | ") }
        val listView = ListView(this).apply {
            adapter = ArrayAdapter(
                this@MainActivity,
                android.R.layout.simple_list_item_multiple_choice, items
            )
            choiceMode = ListView.CHOICE_MODE_MULTIPLE
        }
        AlertDialog.Builder(this)
            .setTitle("选择序列号（可多选）")
            .setView(listView)
            .setPositiveButton("填回") { _, _ ->
                val chosen = ArrayList<String>()
                val checked = listView.checkedItemPositions
                for (i in 0 until checked.size()) {
                    val pos = checked.keyAt(i)
                    if (checked.valueAt(i)) {
                        chosen.add(pickRowValue(snlDef, rows[pos]))
                    }
                }
                if (chosen.isEmpty()) {
                    Toast.makeText(this, "未选择", Toast.LENGTH_SHORT).show()
                    renderScreen(pickingDef)
                    return@setPositiveButton
                }
                // Fill back into the serial field (name/label heuristic).
                val serialField = pickingDef.sendFields.firstOrNull {
                    val h = (it.name + it.label).lowercase()
                    h.contains("sn") || h.contains("serial") || h.contains("序列号") || h.contains("箱")
                } ?: focusedField
                // TODO: multi-serial separator is unverified — comma-joined
                // here; the device test decides whether the server wants
                // one serial per submit instead.
                val joined = chosen.joinToString(",")
                renderScreen(pickingDef)
                if (serialField != null) {
                    fieldValues[serialField.name] = joined
                    fieldInputs[serialField.name]?.setText(joined)
                }
            }
            .setNegativeButton("取消") { _, _ -> renderScreen(pickingDef) }
            .setOnCancelListener { renderScreen(pickingDef) }
            .show()
    }

    /** Find a SEND value by field-name/label hints (e.g. loc/库位, sku/物料). */
    private fun findValueByHint(
        def: ScreenDef,
        values: Map<String, String>,
        hints: List<String>
    ): String? {
        for (f in def.sendFields) {
            val h = (f.name + f.label).lowercase()
            if (hints.any { h.contains(it.lowercase()) }) {
                val v = values[f.name]
                if (!v.isNullOrBlank()) return v
            }
        }
        return null
    }
}
