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

            val keyBytes = Base64.decode(serverPublicKeyBase64, Base64.DEFAULT)
            val serverPublicKey = KeyFactory.getInstance("RSA")
                .generatePublic(X509EncodedKeySpec(keyBytes))
            
            // AES-GCM Encrypt Location and RSA wrap AES Key
            val encryptedLocation = LocationEncryptor.encrypt(lat, lng, serverPublicKey)
            
            // ECDSA P-256 Sign
            val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, encryptedLocation.ciphertext, keyPair.private)

            val packet = SOSPacket(
                eventId = eventId,
                userId = userId,
                locationEnc = encryptedLocation,
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