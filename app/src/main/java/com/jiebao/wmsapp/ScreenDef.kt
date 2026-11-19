package com.jiebao.wmsapp

/**
 * Screen definition (META01 / OT,03) model and parser. Pure Kotlin, no Android.
 *
 * Wire format (verified against /tmp/wms-log/AccessBrowser/ws.log):
 * - Records separated by '\u000C' (form feed), fields separated by '`'.
 * - Each field record has up to 42 items; the index table is PROTOCOL.md §4
 *   (copied from the framework's inforMetaWidget.js constants).
 * - Records after the field records are instructions (6 items):
 *   NOXMIT, SENDIF(...), SET(...), AUTOENTER, SETSCREEN(...), MENU, ...
 *
 * Field record detection: items[1] is a digit 0..5 (type) AND items[2] is one
 * of HEADER / SEND / RECEIVE / DISPLAY. Anything else is an instruction.
 */

/** One field of a screen definition. Index numbers refer to PROTOCOL.md §4. */
data class ScreenField(
    val name: String,        // [0]
    val type: Int,           // [1] 0=label, 1=input, 2=choice, 3=multi, 4=date, 5=image
    val direction: String,   // [2] HEADER / SEND / RECEIVE / DISPLAY
    val seq: Int,            // [3] display/submit order
    val screen: String,      // [4]
    val namespace: String,   // [5]
    val title: String,       // [6]
    val proc: String,        // [7] submit proc (HEADER record carries the screen proc)
    val label: String,       // [8] on-screen label, e.g. 库位 / 货品
    val lkup: String,        // [11] lookup screen; empty = no lookup (F2 disabled)
    val value: String,       // [13] current value
    val editable: String,    // [23] "1" = editable
    val required: String,    // [24] "1" = required
    val visible: String,     // [25] "1" = visible
    val upper: String,       // [26] "true" = force uppercase
    val mask: String,        // [27] '?' string, length ~= max input length
    val vtype: String,       // [34]
    val raw: List<String>
) {
    val isRequired: Boolean get() = required == "1"
    val isEditable: Boolean get() = editable == "1"
    val isVisible: Boolean get() = visible != "0"
    val forceUpper: Boolean get() = upper == "true"

    /** Max input length from the mask ('?' count); -1 when the mask gives none. */
    val maxLength: Int
        get() {
            val n = mask.count { it == '?' }
            return if (n > 0) n else -1
        }
}

/** One trailing instruction record of a screen definition. */
data class ScreenInstruction(
    val seq: String,   // [0]
    val text: String,  // [1] e.g. "SETSCREEN(STDPK11X-1,SEND,SEND)", "ERROR(1,IQ02,1)", "MENU"
    val func: String,  // [2] e.g. "SET", "ERROR", "MENU", "NOXMIT", "SELECTOR"
    val arg: String    // [3] e.g. "STDPK11X-1", "IQ02"
) {
    /** Arguments inside the parens of [text], e.g. ERROR(1,IQ02,1) -> ["1","IQ02","1"]. */
    val args: List<String>
        get() {
            val start = text.indexOf('(')
            val end = text.lastIndexOf(')')
            if (start < 0 || end <= start) return emptyList()
            return text.substring(start + 1, end).split(',').map { it.trim() }
        }
}

/** A parsed screen definition. */
data class ScreenDef(
    val screenName: String,
    val title: String,
    val fields: List<ScreenField>,
    val instructions: List<ScreenInstruction>
) {
    val header: ScreenField? get() = fields.firstOrNull { it.direction == "HEADER" }

    /** Submit proc from the HEADER record index 7.
     * Empty for some screens (e.g. STDPK11) — see [effectiveProcName]. */
    val procName: String get() = header?.proc ?: ""

    /** SEND fields in submit order (index 3). EXEC params follow this order. */
    val sendFields: List<ScreenField>
        get() = fields.filter { it.direction == "SEND" }.sortedBy { it.seq }

    val receiveFields: List<ScreenField>
        get() = fields.filter { it.direction == "RECEIVE" }

    val displayFields: List<ScreenField>
        get() = fields.filter { it.direction == "DISPLAY" }

    val isMenu: Boolean get() = instructions.any { it.func == "MENU" }
    val noXmit: Boolean get() = instructions.any { it.func == "NOXMIT" }
    val autoEnter: Boolean get() = instructions.any { it.func == "AUTOENTER" }
    val xmitOnly: Boolean get() = instructions.any { it.func == "XMITONLY" }
    val isSelector: Boolean get() = instructions.any { it.func == "SELECTOR" }

    /** SETSCREEN target, e.g. "STDPK11X-1" — the next screen after submit. */
    val setScreen: String?
        get() = instructions.firstOrNull { it.text.startsWith("SETSCREEN(") }
            ?.args?.getOrNull(0)

    /** Result screen from the ERROR(...,<screen>,...) instruction,
     * e.g. "IQ02" for IQ01, "IQ14" for IQ10. Used after an OT,01 query result. */
    val resultScreen: String?
        get() = instructions.firstOrNull { it.func == "ERROR" }
            ?.args?.getOrNull(1)

    /**
     * Next screen from a SETSCREEN instruction whose target is a screen name
     * (not a lookup step like "STDPK11X-1"). Used after a successful submit
     * when the server reply carries no new screen. TODO: SETSCREEN can be
     * conditional (SENDIF) — this takes the first unconditional one.
     */
    val nextScreen: String?
        get() = instructions.firstOrNull { it.func == "SETSCREEN" }
            ?.args?.getOrNull(0)?.takeIf { !it.contains("-") && it.isNotBlank() }

    /**
     * Effective EXEC proc for this screen.
     * - HEADER index 7 when present (NSPRFIQ01, NSPRFSND00, ...).
     * - Otherwise derived as "NSPRF" + screenName + "X" (STDPK11 -> NSPRFSTDPK11X).
     *   The derived form is verified for STDPK11 only; other screens with an
     *   empty HEADER proc are a TODO — confirm against the live server.
     */
    fun effectiveProcName(): String {
        if (procName.isNotEmpty()) return procName
        return "NSPRF" + screenName + "X"
    }
}

object ScreenDefParser {
    private val DIRECTIONS = setOf("HEADER", "SEND", "RECEIVE", "DISPLAY")

    /**
     * Parse a screen definition.
     * @param screenName the META01 screen name (e.g. "IQ01").
     * @param defText the definition text: everything after the first '\u000C'
     *   in the OT,03 payload. A leading '\u000C' is tolerated.
     */
    fun parse(screenName: String, defText: String): ScreenDef {
        val fields = ArrayList<ScreenField>()
        val instructions = ArrayList<ScreenInstruction>()
        for (record in defText.split('\u000C')) {
            if (record.isEmpty() || record == ",") continue
            val items = record.split('`')
            if (isFieldRecord(items)) {
                fields.add(parseField(items))
            } else {
                instructions.add(parseInstruction(items))
            }
        }
        val title = fields.firstOrNull { it.direction == "HEADER" }?.title
            ?: fields.firstOrNull()?.title ?: screenName
        return ScreenDef(screenName, title, fields, instructions)
    }

    private fun isFieldRecord(items: List<String>): Boolean {
        if (items.size < 4) return false
        val type = items[1].toIntOrNull() ?: return false
        if (type !in 0..5) return false
        return items[2] in DIRECTIONS
    }

    private fun parseField(items: List<String>): ScreenField {
        fun s(i: Int): String = if (i < items.size) items[i] else ""
        return ScreenField(
            name = s(0),
            type = s(1).toIntOrNull() ?: 0,
            direction = s(2),
            seq = s(3).toIntOrNull() ?: -1,
            screen = s(4),
            namespace = s(5),
            title = s(6),
            proc = s(7),
            label = s(8),
            lkup = s(11),
            value = s(13),
            editable = s(23),
            required = s(24),
            visible = s(25),
            upper = s(26),
            mask = s(27),
            vtype = s(34),
            raw = items
        )
    }

    private fun parseInstruction(items: List<String>): ScreenInstruction {
        fun s(i: Int): String = if (i < items.size) items[i] else ""
        return ScreenInstruction(seq = s(0), text = s(1), func = s(2), arg = s(3))
    }

    /**
     * Build the EXEC business parameters for a screen submit.
     * SEND fields in seq order, each value encodeURIComponent'd, comma-joined,
     * with a trailing comma. Verified against the real log: IQ01 with
     * sku=308649300001 puts the sku at index 2, matching the wire EXEC.
     */
    fun buildExecParams(sendFields: List<ScreenField>, values: Map<String, String>): String {
        val sb = StringBuilder()
        for (f in sendFields.sortedBy { it.seq }) {
            sb.append(WmsCodec.encode(values[f.name] ?: ""))
            sb.append(',')
        }
        return sb.toString()
    }
}

/**
 * OT,01 query-result rows.
 * Wire form: after the OT,01 header (...,No Error,<count>) the remainder is
 * either ",v1,v2,..." (single row) or "\u000C,row1\u000C,row2..." (multi-row,
 * each row comma-separated with a leading empty column).
 * Values are URL-decoded (decodeURIComponent).
 */
object QueryResultParser {
    fun parseRows(remainder: String): List<List<String>> {
        if (remainder.isEmpty()) return emptyList()
        val rows = ArrayList<List<String>>()
        if ('\u000C' in remainder) {
            for (part in remainder.split('\u000C')) {
                if (part.isEmpty()) continue
                rows.add(part.split(',').map { WmsCodec.decode(it) })
            }
        } else {
            rows.add(remainder.split(',').map { WmsCodec.decode(it) })
        }
        return rows
    }
}
