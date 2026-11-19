package com.jiebao.wmsapp

import java.io.File

/**
 * JVM verification for the pure-Kotlin protocol layer (no Android).
 * Run with kotlinc + java; pass the fixtures dir as argv[0].
 *
 *   kotlinc WmsCodec.kt ScreenDef.kt WmsSession.kt ScreenDefTest.kt -d /tmp/wms-test
 *   java -cp /tmp/wms-test com.jiebao.wmsapp.ScreenDefTestKt \
 *        app/src/test/resources/fixtures
 *
 * Fixtures are real OT,03 screen definitions captured from the live server
 * (app/src/test/resources/fixtures/<name>.def). Response strings are synthetic
 * but follow the exact wire format verified against ws.log.
 */
fun main(args: Array<String>) {
    val dir = File(if (args.isNotEmpty()) args[0] else "app/src/test/resources/fixtures")
    var passed = 0
    var failed = 0
    fun check(name: String, cond: Boolean, detail: String = "") {
        if (cond) {
            passed++
            println("PASS $name")
        } else {
            failed++
            println("FAIL $name $detail")
        }
    }

    fun load(name: String): String = File(dir, "$name.def").readText(Charsets.UTF_8)

    // ---- ScreenDef parsing (real defs) ----
    val stdpk11 = ScreenDefParser.parse("STDPK11", load("STDPK11"))
    check("STDPK11 title", stdpk11.title.contains("拣货"), stdpk11.title)
    check("STDPK11 proc derived", stdpk11.effectiveProcName() == "NSPRFSTDPK11X", stdpk11.effectiveProcName())
    val loc = stdpk11.sendFields.firstOrNull { it.name == "loc" }
    check("STDPK11 loc field", loc != null && loc.label == "库位" && loc.lkup == "STDPK11X-1",
        loc?.let { "${it.label} lkup=${it.lkup}" } ?: "missing")
    check("STDPK11 autoEnter", stdpk11.autoEnter)
    check("STDPK11 nextScreen is lookup step (filtered)",
        stdpk11.nextScreen == null, "nextScreen=${stdpk11.nextScreen}")

    val iq01 = ScreenDefParser.parse("IQ01", load("IQ01"))
    check("IQ01 proc", iq01.effectiveProcName() == "NSPRFIQ01", iq01.effectiveProcName())
    check("IQ01 resultScreen", iq01.resultScreen == "IQ02", "resultScreen=${iq01.resultScreen}")
    val sku = iq01.sendFields.firstOrNull { it.name == "sku" }
    check("IQ01 sku field", sku != null && sku.label.contains("货品"), sku?.label ?: "missing")

    val iq02 = ScreenDefParser.parse("IQ02", load("IQ02"))
    check("IQ02 isSelector", iq02.isSelector)
    check("IQ02 has selector SEND", iq02.sendFields.any { it.name == "selector" })

    val iq10 = ScreenDefParser.parse("IQ10", load("IQ10"))
    check("IQ10 resultScreen", iq10.resultScreen == "IQ14", "resultScreen=${iq10.resultScreen}")

    val m2 = ScreenDefParser.parse("M2", load("M2"))
    check("M2 isMenu", m2.isMenu)
    check("M2 title", m2.title.contains("主要菜单"), m2.title)
    check("M2 has IQ item", m2.sendFields.any { it.name == "IQ" && it.label == "库存余额" })
    check("M2 has PM1 item", m2.sendFields.any { it.name == "PM1" })

    val rtx = ScreenDefParser.parse("RTXPICK", load("RTXPICK"))
    check("RTXPICK isMenu", rtx.isMenu)
    check("RTXPICK has STDPK11 item", rtx.sendFields.any { it.name == "STDPK11" })

    val iq = ScreenDefParser.parse("IQ", load("IQ"))
    check("IQ isMenu", iq.isMenu)
    check("IQ has SNL01 item", iq.sendFields.any { it.name == "SNL01" })
    check("IQ has SNI01 item", iq.sendFields.any { it.name == "SNI01" })

    // ---- WmsCodec (JS encodeURIComponent parity) ----
    check("codec space", WmsCodec.encode("a b") == "a%20b", WmsCodec.encode("a b"))
    check("codec colon", WmsCodec.encode("wms.pantum.com:443") == "wms.pantum.com%3A443")
    check("codec slash", WmsCodec.encode("a/b") == "a%2Fb")
    check("codec plus stays", WmsCodec.encode("a+b") == "a%2Bb")
    check("codec chinese", WmsCodec.encode("库位") == "%E5%BA%93%E4%BD%8D", WmsCodec.encode("库位"))
    check("codec decode", WmsCodec.decode("%E5%BA%93%E4%BD%8D") == "库位")
    check("codec decode plus literal", WmsCodec.decode("a+b") == "a+b")
    check("codec roundtrip", WmsCodec.decode(WmsCodec.encode("BOX,CAD2606900B6,1.0")) == "BOX,CAD2606900B6,1.0")

    // ---- buildExecParams: SEND order = seq order, URL-encoded, trailing comma ----
    val params = ScreenDefParser.buildExecParams(
        iq01.sendFields,
        mapOf("sku" to "308649300001")
    )
    // IQ01 sku is the 3rd SEND param (index 2); the wire EXEC matches.
    val parts = params.split(',')
    check("IQ01 params sku at index 2", parts.getOrNull(2) == "308649300001", params)
    check("IQ01 params trailing comma", params.endsWith(","), params)

    // ---- QueryResultParser: multi-row OT,01 ----
    val rows = QueryResultParser.parseRows(
        ",PANTUM,0000214302,308649300001,1.0\u000C,PANTUM,0000214303,308649300002,2.0"
    )
    check("query rows count", rows.size == 2, rows.toString())
    check("query row leading empty", rows[0].getOrNull(0) == "", rows[0].toString())
    check("query row sku", rows[0].getOrNull(3) == "308649300001", rows[0].toString())

    // ---- WmsResponseParser ----
    val ok1 = WmsResponseParser.parse(
        "646394 1,190690,157564,INFOR_WM_wmwhse2,OT,01,wms.pantum.com%3A443,No%20Error,1,BOX,CAD2606900B6,1.0"
    )
    check("OT,01 single row is Data", ok1 is WmsResponse.Data, ok1.toString())
    if (ok1 is WmsResponse.Data) {
        check("OT,01 single row values", ok1.rows.firstOrNull() == listOf("BOX", "CAD2606900B6", "1.0"),
            ok1.rows.toString())
    }
    val ok2 = WmsResponseParser.parse(
        "646394 1,190690,157564,INFOR_WM_wmwhse2,OT,01,wms.pantum.com%3A443,No%20Error,4\u000C,PANTUM,0000214302,308649300001,1.0"
    )
    check("OT,01 multi row is Data", ok2 is WmsResponse.Data, ok2.toString())
    if (ok2 is WmsResponse.Data) {
        check("OT,01 multi row count", ok2.rows.size == 1, ok2.rows.toString())
    }
    val err = WmsResponseParser.parse(
        "601725 %s,%s,%s,%s,RF,09,%s,%E8%BE%93%E5%85%A5%E5%86%85%E5%AE%B9%E9%94%99%E8%AF%AF,%s"
    )
    check("RF,09 is Error", err is WmsResponse.Error, err.toString())
    if (err is WmsResponse.Error) {
        check("RF,09 message decoded", err.message == "输入内容错误", err.message)
    }
    val nosession = WmsResponseParser.parse(
        "826408 1,190690,294937,INFOR_WM_wmwhse2,INFOR,STDPK1,9,wms.pantum.com%3A443,NO SESSION,1"
    )
    check("NO SESSION is Error", nosession is WmsResponse.Error, nosession.toString())
    if (nosession is WmsResponse.Error) {
        check("NO SESSION message", nosession.message == "NO SESSION", nosession.message)
    }
    val screen = WmsResponseParser.parse(
        "811864 1,190690,157564,INFOR_WM_wmwhse2,OT,03,wms.pantum.com%3A443,No%20Error,1\u000CM2_hdr`0`HEADER`1`M2``WMS 主菜单 M2``"
    )
    check("OT,03 is Screen", screen is WmsResponse.Screen, screen.toString())
    if (screen is WmsResponse.Screen) {
        check("OT,03 def non-empty", screen.defText.contains("M2_hdr"), screen.defText)
    }
    val timeout = WmsResponseParser.parse("")
    check("empty is Empty(timeout)", timeout is WmsResponse.Empty, timeout.toString())

    println()
    println("passed=$passed failed=$failed")
    if (failed > 0) {
        kotlin.system.exitProcess(1)
    }
}
