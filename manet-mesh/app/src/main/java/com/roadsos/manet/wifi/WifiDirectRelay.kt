package com.roadsos.manet.wifi

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pManager
import com.roadsos.manet.crypto.SOSPacket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.OutputStreamWriter
import java.net.ServerSocket
import java.net.Socket

@SuppressLint("MissingPermission")
class WifiDirectRelay(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val manager = context.getSystemService(Context.WIFI_P2P_SERVICE) as WifiP2pManager
    private val channel = manager.initialize(context, context.mainLooper, null)

    companion object {
        const val PORT = 8988
        const val ROADSOS_SERVICE_NAME = "roadsos_sos"
    }

    // Discovers nearby Wi-Fi Direct peers and sends SOS packet to first found
    fun sendPacket(packet: SOSPacket, onSent: () -> Unit, onFailed: () -> Unit) {
        manager.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                manager.requestPeers(channel) { peerList ->
                    val peer = peerList.deviceList.firstOrNull()
                    if (peer != null) {
                        connectAndSend(peer, packet, onSent, onFailed)
                    } else {
                        onFailed()
                    }
                }
            }
            override fun onFailure(reason: Int) { onFailed() }
        })
    }

    // Starts a server socket waiting for incoming SOS packets from peers
    fun startReceiving(onPacketReceived: (SOSPacket) -> Unit) {
        scope.launch {
            runCatching {
                val serverSocket = ServerSocket(PORT)
                val client = serverSocket.accept()
                val json = client.inputStream.bufferedReader().readText()
                client.close()
                serverSocket.close()
                SOSPacket.fromJson(json)
            }.onSuccess { onPacketReceived(it) }
        }
    }

    private fun connectAndSend(
        peer: WifiP2pDevice,
        packet: SOSPacket,
        onSent: () -> Unit,
        onFailed: () -> Unit
    ) {
        val config = WifiP2pConfig().apply { deviceAddress = peer.deviceAddress }
        manager.connect(channel, config, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                scope.launch {
                    runCatching {
                        val socket = Socket(peer.deviceAddress, PORT)
                        val writer = OutputStreamWriter(socket.getOutputStream())
                        writer.write(packet.toJson())
                        writer.flush()
                        socket.close()
                    }.onSuccess { onSent() }.onFailure { onFailed() }
                }
            }
            override fun onFailure(reason: Int) { onFailed() }
        })
    }
}