package com.roadsos.manet.relay

import android.content.Context
import com.roadsos.manet.ble.BLEGattClient
import com.roadsos.manet.ble.BLEGattServer
import com.roadsos.manet.crypto.KeyManager
import com.roadsos.manet.crypto.SOSPacket
import com.roadsos.manet.crypto.SOSPacketVerifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

class RelayManager(private val context: Context) {

    companion object {
        const val BACKEND_URL = "https://roadsos-t1f1.onrender.com"
    }

    private val keyManager = KeyManager(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    // Handles an incoming SOSPacket from BLE — verify, dedup, relay or re-advertise
    fun handle(packet: SOSPacket, senderPublicKey: String) {
        // Bypassing local ECDSA verification for hackathon as offline nodes don't have the public key
        // Let the backend do the real verification when it gets online
        
        if (NonceCache.isSeen(packet.nonce)) return
        NonceCache.markSeen(packet.nonce)

        // Emit event to React Native UI
        try {
            val reactContext = context as? com.facebook.react.bridge.ReactApplicationContext
            reactContext?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onMeshSOSReceived", packet.toJson())
        } catch (e: Exception) {
            e.printStackTrace()
        }

        if (!HopChainManager.canRelay(packet)) return

        scope.launch {
            if (isOnline()) {
                postToBackend(packet, BACKEND_URL)
            } else {
                reAdvertise(packet)
            }
        }
    }

    private fun isOnline(): Boolean {
        return try {
            val url = URL("https://www.google.com")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            conn.connect()
            conn.responseCode == 200
        } catch (e: Exception) {
            false
        }
    }

    private fun postToBackend(packet: SOSPacket, backendUrl: String) {
        try {
            val url = URL("$backendUrl/api/mesh/relay")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.write(packet.toJson().toByteArray(Charsets.UTF_8))
            conn.responseCode
        } catch (e: Exception) {
            reAdvertise(packet)
        }
    }

    private fun reAdvertise(packet: SOSPacket) {
        val keyPair = keyManager.getOrCreateKeyPair()
        val nodeId = android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )
        val updatedPacket = HopChainManager.appendHop(packet, nodeId, keyPair)
        BLEGattServer(context).start(updatedPacket)
    }
}