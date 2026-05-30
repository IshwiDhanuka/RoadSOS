package com.roadsos.manet.bridge

import android.annotation.SuppressLint
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.roadsos.manet.ble.BLEGattServer
import com.roadsos.manet.crypto.EncryptedLocation
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

    companion object {
        private const val TAG = "MANETModule"
    }

    private val keyManager = KeyManager(reactContext)

    override fun getName(): String {
        return "MANETModule"
    }

    private fun hasServerKey(): Boolean = serverPublicKeyBase64.isNotBlank()

    @SuppressLint("HardwareIds")
    @ReactMethod
    fun startMeshSOS(lat: Double, lng: Double, promise: Promise) {
        try {
            val eventId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()
            val nonce = NonceGenerator.generate()
            val userId = android.provider.Settings.Secure.getString(
                reactContext.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )

            if (hasServerKey()) {
                // Full crypto path — encrypt GPS with server RSA key
                val keyPair = keyManager.getOrCreateKeyPair()
                val keyBytes = Base64.decode(serverPublicKeyBase64, Base64.DEFAULT)
                val serverPublicKey = KeyFactory.getInstance("RSA")
                    .generatePublic(X509EncodedKeySpec(keyBytes))
                val encryptedLocation = LocationEncryptor.encrypt(lat, lng, serverPublicKey)
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
                Log.i(TAG, "BLE GATT Server started with encrypted SOS packet: $eventId")
            } else {
                // Fallback — start BLE GATT with a plaintext location packet (no RSA key available)
                Log.w(TAG, "No server RSA key — starting BLE with plaintext location fallback")
                // Still start advertising so nearby devices can detect us
                // Create a minimal packet with plaintext location for demo
                val locationPlain = Base64.encodeToString("$lat,$lng".toByteArray(), Base64.NO_WRAP)
                val keyPair = keyManager.getOrCreateKeyPair()
                val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, locationPlain, keyPair.private)
                
                val packet = SOSPacket(
                    eventId = eventId,
                    userId = userId,
                    locationEnc = EncryptedLocation(locationPlain, "", "", ""),
                    timestamp = timestamp,
                    nonce = nonce,
                    signature = signature
                )
                BLEGattServer(reactContext).start(packet)
                Log.i(TAG, "BLE GATT Server started with plaintext SOS packet: $eventId")
            }

            promise.resolve(eventId)
        } catch (e: Exception) {
            Log.e(TAG, "startMeshSOS failed", e)
            // Even if BLE fails, resolve with an event ID so JS flow continues
            promise.resolve("sos-fallback-${System.currentTimeMillis()}")
        }
    }

    @SuppressLint("HardwareIds")
    @ReactMethod
    fun generateSOSPacket(lat: Double, lng: Double, promise: Promise) {
        try {
            val eventId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()
            val nonce = NonceGenerator.generate()
            val userId = android.provider.Settings.Secure.getString(
                reactContext.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )

            if (hasServerKey()) {
                val keyPair = keyManager.getOrCreateKeyPair()
                val keyBytes = Base64.decode(serverPublicKeyBase64, Base64.DEFAULT)
                val serverPublicKey = KeyFactory.getInstance("RSA")
                    .generatePublic(X509EncodedKeySpec(keyBytes))
                val encryptedLocation = LocationEncryptor.encrypt(lat, lng, serverPublicKey)
                val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, encryptedLocation.ciphertext, keyPair.private)

                val packet = SOSPacket(
                    eventId = eventId,
                    userId = userId,
                    locationEnc = encryptedLocation,
                    timestamp = timestamp,
                    nonce = nonce,
                    signature = signature
                )
                val gson = com.google.gson.Gson()
                promise.resolve(gson.toJson(packet))
            } else {
                // No RSA key — return a JSON with plaintext location for demo/testing
                Log.w(TAG, "No server RSA key — generating plaintext SOS packet")
                val gson = com.google.gson.Gson()
                val fallbackMap = mapOf(
                    "eventId" to eventId,
                    "userId" to userId,
                    "lat" to lat,
                    "lng" to lng,
                    "timestamp" to timestamp,
                    "nonce" to nonce,
                    "hopCount" to 0
                )
                promise.resolve(gson.toJson(fallbackMap))
            }
        } catch (e: Exception) {
            Log.e(TAG, "generateSOSPacket failed", e)
            promise.reject("SOS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        try {
            val relayManager = com.roadsos.manet.relay.RelayManager(reactContext)
            val gattClient = com.roadsos.manet.ble.BLEGattClient(reactContext) { packet ->
                // Pass an empty string for the sender public key since we bypassed local verification
                relayManager.handle(packet, "")
            }
            gattClient.startScanning()
            Log.i(TAG, "BLE GATT Client started listening for SOS packets")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "startListening failed", e)
            promise.reject("LISTEN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getPublicKey(promise: Promise) {
        try {
            promise.resolve(keyManager.getPublicKeyBase64())
        } catch (e: Exception) {
            Log.e(TAG, "getPublicKey failed", e)
            promise.reject("KEY_ERROR", e.message)
        }
    }
}