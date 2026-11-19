package com.jiebao.wmsapp

/**
 * encodeURIComponent / decodeURIComponent equivalents (pure Kotlin, no Android).
 *
 * The WMS framework uses JS `encodeURIComponent` on every parameter value
 * (inforUtilities.js `addEncodedDataParameters`) and `decodeURIComponent`
 * on receipt. Java's URLEncoder/URLDecoder do NOT match (they map space
 * to/from '+'), so the codec is implemented directly on UTF-8 bytes.
 *
 * Verified against the real ws.log: e.g. `费用性领料-null` encodes to
 * `%E8%B4%B9%E7%94%A8%E6%80%A7%E9%A2%86%E6%96%99-null` (`-` stays literal),
 * `wms.pantum.com:443` encodes to `wms.pantum.com%3A443`.
 */
object WmsCodec {
    private val UNRESERVED: Set<Char> =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()".toSet()
    private val HEX = "0123456789ABCDEF"

    /** JS encodeURIComponent: percent-encode UTF-8 bytes except the unreserved set. */
    fun encode(value: String): String {
        val out = StringBuilder(value.length)
        for (b in value.toByteArray(Charsets.UTF_8)) {
            val c = b.toInt() and 0xFF
            if (c < 128 && UNRESERVED.contains(c.toChar())) {
                out.append(c.toChar())
            } else {
                out.append('%')
                out.append(HEX[c ushr 4])
                out.append(HEX[c and 0x0F])
            }
        }
        return out.toString()
    }

    /** JS decodeURIComponent: decode %XX sequences to bytes, then UTF-8.
     * A literal '+' stays '+' (unlike form decoding). */
    fun decode(value: String): String {
        val bytes = ArrayList<Byte>(value.length)
        var i = 0
        while (i < value.length) {
            val c = value[i]
            if (c == '%' && i + 2 < value.length) {
                val v = value.substring(i + 1, i + 3).toIntOrNull(16)
                if (v != null) {
                    bytes.add(v.toByte())
                    i += 3
                    continue
                }
            }
            val charBytes = c.toString().toByteArray(Charsets.UTF_8)
            for (b in charBytes) bytes.add(b)
            i++
        }
        val arr = ByteArray(bytes.size)
        for (j in bytes.indices) arr[j] = bytes[j]
        return String(arr, Charsets.UTF_8)
    }
}
