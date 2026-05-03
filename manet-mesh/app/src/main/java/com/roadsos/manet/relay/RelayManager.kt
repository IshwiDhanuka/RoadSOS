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
import org.apache.commons.codec.binary.Base64
import java.net.HttpURLConnection
import java.net.URL

class RelayManager(private val context: Context) {

    private val keyManager = KeyManager(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    // Handles an incoming SOSPacket from BLE — verify, dedup, relay or re-advertise
    fun handle(packet: SOSPacket, senderPublicKey: String, backendUrl: String) {
        // Drop if signature invalid
        if (!SOSPacketVerifier.verify(
                packet.eventId, packet.timestamp, packet.nonce,
                packet.locationEnc.ciphertext, packet.signature, senderPublicKey
            )) return

        // Drop if already seen (replay prevention)
        if (NonceCache.isSeen(packet.nonce)) return
        NonceCache.markSeen(packet.nonce)

        // Drop if TTL exceeded
        if (!HopChainManager.canRelay(packet)) return

        scope.launch {
            if (isOnline()) {
                postToBackend(packet, backendUrl)
            } else {
                reAdvertise(packet)
            }
        }
    }

    // Checks basic connectivity by attempting a HEAD request
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

    // Posts verified packet to backend relay endpoint
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

    // Re-advertises packet via BLE for next relay node to pick up
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