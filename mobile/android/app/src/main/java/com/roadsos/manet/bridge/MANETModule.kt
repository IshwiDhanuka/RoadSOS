package com.roadsos.manet.bridge

import android.annotation.SuppressLint
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.roadsos.manet.ble.BLEGattServer
import com.roadsos.manet.crypto.KeyManager
import com.roadsos.manet.crypto.LocationEncryptor
import com.roadsos.manet.crypto.NonceGenerator
import com.roadsos.manet.crypto.SOSPacket
import com.roadsos.manet.crypto.SOSPacketSigner
import java.security.KeyFactory
import java.security.spec.X509EncodedKeySpec
import java.util.UUID

class MANETModule(
    private val reactContext: ReactApplicationContext,
    private val serverPublicKeyBase64: String
) : ReactContextBaseJavaModule(reactContext) {

    private val keyManager = KeyManager(reactContext)

    override fun getName(): String {
        return "MANETModule"
    }

    @SuppressLint("HardwareIds")
    @ReactMethod
    fun startMeshSOS(lat: Double, lng: Double, promise: Promise) {
        try {
            val keyPair = keyManager.getOrCreateKeyPair()
            val eventId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()
            val nonce = NonceGenerator.generate()
            val userId = android.provider.Settings.Secure.getString(
                reactContext.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )

            // If public key is not provided or invalid, skip encryption for testing
            val signature = try {
                val keyBytes = Base64.decode(serverPublicKeyBase64, Base64.DEFAULT)
                val serverPublicKey = KeyFactory.getInstance("RSA")
                    .generatePublic(X509EncodedKeySpec(keyBytes))
                val encryptedLocation = LocationEncryptor.encrypt(lat, lng, serverPublicKey)
                SOSPacketSigner.sign(eventId, timestamp, nonce, encryptedLocation.ciphertext, keyPair.private)
            } catch(e: Exception) {
                // Fallback dummy signature for demo
                "dummy_signature"
            }

            val packet = SOSPacket(
                eventId = eventId,
                userId = userId,
                locationEnc = com.roadsos.manet.crypto.EncryptedLocation("mock_cipher", "mock_key", "mock_iv", "mock_tag"),
                timestamp = timestamp,
                nonce = nonce,
                signature = signature
            )

            BLEGattServer(reactContext).start(packet)
            promise.resolve(eventId)
        } catch (e: Exception) {
            promise.reject("SOS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getPublicKey(promise: Promise) {
        promise.resolve(keyManager.getPublicKeyBase64())
    }
}