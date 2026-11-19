package com.jiebao.wmsapp

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.conscrypt.Conscrypt
import java.security.Security
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * jWebSocket transport to the WMS server. Pure OkHttp WebSocket.
 *
 * Verified against the real ws.log and the framework (inforMetaWS.js):
 * - URL: wss://wms.pantum.com:443/wm_webrf (fixed).
 * - On connect the server sends `maxframesize40000000`, then a welcome JSON
 *   {"ns":"org.jwebsocket.plugins.system","type":"welcome",...}.
 * - Outbound: "<6-digit-id> <payload>" (id = random 6-digit, framework generateID()).
 * - Inbound ack: every message that has a packet id (text before the first ',')
 *   must be answered with "pda<packetId>" immediately, or the server stops
 *   sending. JSON welcome and "maxframe..." messages are NOT acked.
 *   A PONG ("<pingId> PONG") has no comma, so its ack is the bare "pda".
 * - Fragmented messages: "<packetId>,FRAGMENT<n>,..." / "LFRAGMENT<n>,..."
 *   are reassembled before routing.
 * - Responses are routed to the sender's callback by request id (the token
 *   after the first comma, before the first space).
 * - PING: "<id> PING", server replies "<id> PONG".
 * - Reconnect: 3s delay, like the framework's onclose handler.
 */
class WmsProtocol(private val listener: Listener) {

    interface Listener {
        /** WebSocket open and welcome JSON received; ready to send. */
        fun onReady()

        /** Connection closed or failed (a reconnect is attempted automatically).
         * [reason] is the underlying cause when known (shown on screen so the
         * user can report it); null when the close was clean/unspecified. */
        fun onDisconnected(reason: String?)
    }

    companion object {
        const val WS_URL = "wss://wms.pantum.com:443/wm_webrf"
        private const val PING_INTERVAL_MS = 30_000L
        private const val RESPONSE_TIMEOUT_MS = 60_000L
        private const val RECONNECT_DELAY_MS = 3_000L
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(0, TimeUnit.MILLISECONDS) // app-level PING/PONG, not OkHttp's
        .build()

    init {
        // Modern TLS on old Android: insert Conscrypt as the preferred security
        // provider so OkHttp's default SSLSocketFactory negotiates with a
        // current TLS 1.2/1.3 stack. On Android 6.0 the platform stack fails
        // this server's handshake while the WebView (Chromium) succeeds.
        // No-op if Conscrypt is already installed or unavailable.
        try {
            if (Security.getProvider("Conscrypt") == null) {
                Security.insertProviderAt(Conscrypt.newProvider(), 1)
            }
        } catch (_: Throwable) {
        }
    }

    private val scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val connected = AtomicBoolean(false)
    private val welcomeSeen = AtomicBoolean(false)
    private val closing = AtomicBoolean(false)

    @Volatile private var socket: WebSocket? = null
    private var pingTask: ScheduledFuture<*>? = null

    /** msgId -> callback, for outstanding requests. */
    private val pending = ConcurrentHashMap<String, (String) -> Unit>()

    /** fragId -> accumulated payload. */
    private val fragments = ConcurrentHashMap<String, StringBuilder>()

    private val msgLock = Any()

    fun connect() {
        closing.set(false)
        welcomeSeen.set(false)
        // Origin matches the browser client (the page at https://wms.pantum.com);
        // the server may check it on the handshake. No cookies are needed:
        // auth happens over the socket via METAOT08/WEBRFOT08.
        val request = Request.Builder()
            .url(WS_URL)
            .header("Origin", "https://wms.pantum.com")
            .build()
        socket = client.newWebSocket(request, SocketListener())
    }

    fun disconnect() {
        closing.set(true)
        pingTask?.cancel(false)
        pingTask = null
        try {
            socket?.close(1000, "app closing")
        } catch (_: Exception) {
        }
        socket = null
        connected.set(false)
    }

    fun isConnected(): Boolean = connected.get() && welcomeSeen.get()

    /** Generate a 6-digit id like the framework's generateID() (random, zero-padded). */
    fun nextId(): String {
        val n = (Math.random() * 999999).toInt()
        return n.toString().padStart(6, '0')
    }

    /**
     * Send "<id> <payload>" and route the response (by request id) to [onResponse].
     * The response text passed to the callback is the part after the packet id,
     * i.e. "<reqId> <csv...>" — the same shape the framework hands to handlers.
     * Returns the msgId, or "" when the socket is not open.
     */
    fun send(payload: String, onResponse: ((String) -> Unit)? = null): String {
        val ws = socket ?: return ""
        if (!connected.get()) return ""
        val id = nextId()
        val msg = "$id $payload"
        if (onResponse != null) {
            pending[id] = onResponse
            scheduler.schedule({
                val cb = pending.remove(id)
                cb?.invoke("")
            }, RESPONSE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        }
        synchronized(msgLock) {
            ws.send(msg)
        }
        return id
    }

    /** Send "<id> PING"; [onPong] runs when "<id> PONG" arrives. */
    fun sendPing(onPong: (() -> Unit)? = null) {
        send("PING") { _ -> onPong?.invoke() }
    }

    private fun startPingLoop() {
        pingTask?.cancel(false)
        pingTask = scheduler.scheduleAtFixedRate({
            if (connected.get()) sendPing(null)
        }, PING_INTERVAL_MS, PING_INTERVAL_MS, TimeUnit.MILLISECONDS)
    }

    private fun scheduleReconnect() {
        if (closing.get()) return
        scheduler.schedule({ connect() }, RECONNECT_DELAY_MS, TimeUnit.MILLISECONDS)
    }

    private fun onText(text: String) {
        if (text.startsWith("{")) {
            // Welcome JSON — no ack. Marks the connection ready.
            welcomeSeen.set(true)
            listener.onReady()
            return
        }
        if (text.startsWith("maxframe")) return // no ack
        if (text == "TIMEOUT") {
            disconnect()
            scheduleReconnect()
            return
        }
        // Ack: packet id = text before the first ',' ("" when there is none,
        // e.g. "<id> PONG" -> bare "pda").
        val comma = text.indexOf(',')
        val packetId = if (comma >= 0) text.substring(0, comma) else ""
        synchronized(msgLock) {
            socket?.send("pda$packetId")
        }
        val rest = if (comma >= 0) text.substring(comma + 1) else text
        when {
            rest.startsWith("FRAGMENT") -> {
                val idx = rest.indexOf(',')
                if (idx < 0) return
                val fragId = rest.substring(8, idx)
                fragments.getOrPut(fragId) { StringBuilder() }
                    .append(rest.substring(idx + 1))
            }
            rest.startsWith("LFRAGMENT") -> {
                val idx = rest.indexOf(',')
                if (idx < 0) return
                val fragId = rest.substring(9, idx)
                val buf = fragments.remove(fragId) ?: StringBuilder()
                buf.append(rest.substring(idx + 1))
                route(buf.toString())
            }
            else -> route(rest)
        }
    }

    /** Route a complete message ("<reqId> <csv...>") to its callback. */
    private fun route(data: String) {
        val msgId = parseMsgId(data) ?: return
        val cb = pending.remove(msgId) ?: return
        cb(data)
    }

    /** Request id = token before the first space ("<reqId> <csv...>"). */
    private fun parseMsgId(data: String): String? {
        val sp = data.indexOf(' ')
        if (sp <= 0) return null
        return data.substring(0, sp)
    }

    private inner class SocketListener : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            connected.set(true)
            startPingLoop()
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            onText(text)
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
            onText(bytes.utf8())
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            connected.set(false)
            welcomeSeen.set(false)
            webSocket.close(1000, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            connected.set(false)
            welcomeSeen.set(false)
            listener.onDisconnected(if (reason.isNotEmpty()) "closed $code: $reason" else "closed $code")
            scheduleReconnect()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            connected.set(false)
            welcomeSeen.set(false)
            // Surface the real cause (e.g. TLS handshake / cert / timeout) so
            // the user can report it instead of only seeing "reconnecting".
            val detail = (t.message ?: t.javaClass.simpleName).take(200)
            val http = response?.let { " (HTTP ${it.code})" } ?: ""
            listener.onDisconnected("${t.javaClass.simpleName}: $detail$http")
            scheduleReconnect()
        }
    }
}
