package com.jiebao.wmsapp

/**
 * Pure response parser (no Android dependency — unit-testable).
 * Parses a routed response ("<reqId> <csv...>").
 *
 * Normal layout: [0]=1, [1]=user, [2]=session, [3]=whse, [4]=OT/RF,
 * [5]=type (01/02/03/09), [6]=host, [7]=result ("No Error" or error
 * text), [8]=count, [9..]=data. Multi-row OT,01 and OT,03 defs follow
 * a '\u000C'. RF,09 errors use the same layout with literal "%s"
 * placeholders for the header/host fields.
 *
 * The "NO SESSION" error shifts one field: [4]=INFOR, [5]=screen
 * (e.g. STDPK1), [6]=type (9), [7]=host, [8]=result, [9]=count.
 * So when [5] is not a known type, anchor on the host field instead.
 */
object WmsResponseParser {
    const val HOST = "wms.pantum.com:443"

    fun parse(data: String): WmsResponse {
        if (data.isEmpty()) return WmsResponse.Empty("timeout")
        val sp = data.indexOf(' ')
        if (sp < 0) return WmsResponse.Empty(data)
        val csv = data.substring(sp + 1)
        // Split header from the \u000C payload (rows or screen def).
        val ff = csv.indexOf('\u000C')
        val headerPart = if (ff >= 0) csv.substring(0, ff) else csv
        val payload = if (ff >= 0) csv.substring(ff + 1) else ""
        val fields = headerPart.split(',').map { WmsCodec.decode(it) }
        if (fields.size < 8) return WmsResponse.Empty(data)
        var typeIdx = 5
        var resultIdx = 7
        var countIdx = 8
        if (fields[5] !in setOf("01", "02", "03", "09")) {
            val hostIdx = fields.indexOfFirst { it == HOST || it.contains("wms.pantum.com") }
            if (hostIdx >= 2) {
                typeIdx = hostIdx - 1
                resultIdx = hostIdx + 1
                countIdx = hostIdx + 2
            }
        }
        if (fields.size <= resultIdx) return WmsResponse.Empty(data)
        val type = fields[typeIdx]
        val result = fields[resultIdx]
        if (type == "09" || type == "9" || result != "No Error") {
            val msg = if (result.isEmpty() || result == "%s") "未知错误" else result
            return WmsResponse.Error(msg)
        }
        return when (type) {
            "01", "02" -> {
                // First row: comma fields after the count (present when there
                // is no \u000C right after the count — single-row results
                // and the login reply). Further rows: \u000C-separated
                // sections (each starts with a comma, so its first value
                // is "").
                val rows = ArrayList<List<String>>()
                if (fields.size > countIdx + 1) {
                    rows.add(fields.subList(countIdx + 1, fields.size))
                }
                if (ff >= 0 && payload.isNotEmpty()) {
                    rows.addAll(QueryResultParser.parseRows(payload))
                }
                if (type == "01") WmsResponse.Data(rows) else WmsResponse.Data2(rows)
            }
            "03" -> WmsResponse.Screen(payload)
            else -> WmsResponse.Empty(data)
        }
    }
}

/** A parsed server reply to an EXEC. */
sealed class WmsResponse {
    /** OT,01: data rows (each row's first value is "" — leading comma). */
    data class Data(val rows: List<List<String>>) : WmsResponse()

    /** OT,02: data rows (same shape as OT,01; kept distinct so callers can
     * tell the two apart — e.g. after STDPK22X, OT,02 means "go to STDPK23X"). */
    data class Data2(val rows: List<List<String>>) : WmsResponse()

    /** OT,03: screen definition text ("" when the reply carries no def). */
    data class Screen(val defText: String) : WmsResponse()

    /** RF,09 / OT,09, or any reply whose result is not "No Error". */
    data class Error(val message: String) : WmsResponse()

    /** Timeout ("") or an unrecognized reply. */
    data class Empty(val raw: String) : WmsResponse()
}
