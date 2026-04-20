package com.roadsos.manet.bridge

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.roadsos.manet.crypto.KeyManager
import com.roadsos.manet.crypto.NonceGenerator
import com.roadsos.manet.crypto.SOSPacket
import com.roadsos.manet.crypto.SOSPacketSigner
import com.roadsos.manet.ble.BLEGattServer
import java.util.UUID

class MANETModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MANETModule"

    private val keyManager = KeyManager(reactContext)

    // Builds and broadcasts signed SOSPacket over BLE when device is offline
    @ReactMethod
    fun startMeshSOS(lat: Double, lng: Double, backendUrl: String, promise: Promise) {
        try {
            val keyPair = keyManager.getOrCreateKeyPair()
            val eventId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()
            val nonce = NonceGenerator.generate()
            val userId = android.provider.Settings.Secure.getString(
                reactContext.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )

            val locationEnc = android.util.Base64.encodeToString(
                "$lat,$lng".toByteArray(), android.util.Base64.NO_WRAP
            )

            val signature = SOSPacketSigner.sign(
                eventId, timestamp, nonce, locationEnc, keyPair.private
            )

            val packet = SOSPacket(
                eventId = eventId,
                userId = userId,
                locationEnc = locationEnc,
                encKey = "",
                iv = "",
                timestamp = timestamp,
                nonce = nonce,
                signature = signature
            )

            BLEGattServer(reactContext).start(packet)
            promise.resolve(eventId)

        } catch (e: Exception) {
            promise.reject("MANET_ERROR", e.message)
        }
    }

    // Returns device public key as Base64 for Firestore registration
    @ReactMethod
    fun getPublicKey(promise: Promise) {
        try {
            promise.resolve(keyManager.getPublicKeyBase64())
        } catch (e: Exception) {
            promise.reject("KEY_ERROR", e.message)
        }
    }
}