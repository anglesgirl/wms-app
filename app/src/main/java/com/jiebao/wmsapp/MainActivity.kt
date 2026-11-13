package com.jiebao.wmsapp

import android.app.Activity
import android.annotation.SuppressLint
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Dedicated WMS app shell (Pantum Infor SCE mobile web client).
 *
 * The 13 client files captured by AccessBrowser v1.5 are bundled as assets.
 * The page is loaded with [BASE_URL] as base so every relative path resolves
 * exactly as on the live site:
 *  - bundled mobile-web-client JS/CSS (under /svc_wm/app/.../mobile-web-client/)
 *    are served from assets by [AssetWebViewClient];
 *  - the 4 InforUX standard libs, config JSON (mobile-web-client.json),
 *    locales/translations and images are fetched live from wms.pantum.com;
 *  - the framework's getURLBase() still sees a "svc_wm" script src, so it
 *    derives theID="wm" and loads the config from the right live path.
 *  - WebSocket (wss://wms.pantum.com:443/wm_webrf) and login (NSPRFMETAOT08,
 *    reconnect NSPRFWEBRFOT08) are handled entirely by the bundled JS.
 * Menus are dynamic (EXEC NSPRFMETA01 per screen) — nothing is hardcoded here.
 */
class MainActivity : Activity() {

    companion object {
        /** Live page URL the client was captured from; used as the base URL. */
        const val BASE_URL = "https://wms.pantum.com/wm/sce/mobile-web-client/"

        /** Asset path prefixes served locally instead of fetched live. */
        private val LOCAL_PREFIXES = listOf(
            "https://wms.pantum.com/svc_wm/app/js/mobile-web-client/",
            "https://wms.pantum.com/svc_wm/app/css/mobile-web-client/"
        )
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Warehouse use: don't let the screen sleep mid-task.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this)
        setContentView(webView)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // The client layout is built for a small PDA screen (240px columns);
            // let the WebView scale it to the ST6750 display.
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            setSupportZoom(true)
            // Page is https-based; file access is not needed.
            allowFileAccess = false
        }

        webView.webViewClient = AssetWebViewClient()

        val html = assets.open("inforMetaClient.html").bufferedReader().use { it.readText() }
        webView.loadDataWithBaseURL(BASE_URL, html, "text/html", "UTF-8", null)
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    /**
     * Serves the bundled mobile-web-client files from assets; everything else
     * (InforUX libs, config/locales JSON, images, WS) goes to the live server.
     */
    private inner class AssetWebViewClient : WebViewClient() {

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            return serveLocal(request.url.toString())
        }

        @Deprecated("Deprecated in Java")
        override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
            return serveLocal(url)
        }

        private fun serveLocal(url: String): WebResourceResponse? {
            val prefix = LOCAL_PREFIXES.firstOrNull { url.startsWith(it) } ?: return null
            // Strip query string (?v=11.0.0000) before taking the filename.
            val path = url.substringBefore('?')
            val fileName = path.substringAfterLast('/')
            if (fileName.isEmpty()) return null
            return try {
                val mime = when {
                    fileName.endsWith(".js") -> "text/javascript"
                    fileName.endsWith(".css") -> "text/css"
                    else -> return null
                }
                WebResourceResponse(mime, "UTF-8", assets.open(fileName))
            } catch (e: Exception) {
                // Asset missing: fall through to the live server.
                null
            }
        }
    }
}
