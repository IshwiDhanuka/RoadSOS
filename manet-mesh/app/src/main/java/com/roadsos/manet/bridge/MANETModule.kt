package com.roadsos.manet.bridge

import android.annotation.SuppressLint
import android.content.Context
import android.util.Base64
import com.roadsos.manet.BuildConfig
import com.roadsos.manet.ble.BLEGattServer
import com.roadsos.manet.crypto.KeyManager
import com.roadsos.manet.crypto.LocationEncryptor
import com.roadsos.manet.crypto.NonceGenerator
import com.roadsos.manet.crypto.SOSPacket
import com.roadsos.manet.crypto.SOSPacketSigner
import java.security.KeyFactory
import java.security.spec.X509EncodedKeySpec
import java.util.UUID

class MANETModule(private val context: Context) {

    private val keyManager = KeyManager(context)

    // Builds signed, GPS-encrypted SOSPacket and broadcasts over BLE
    @SuppressLint("HardwareIds")
    fun startMeshSOS(lat: Double, lng: Double): String {
        val keyPair = keyManager.getOrCreateKeyPair()
        val eventId = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()
        val nonce = NonceGenerator.generate()
        val userId = android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )

        val keyBytes = Base64.decode(BuildConfig.SERVER_PUBLIC_KEY, Base64.DEFAULT)
        val serverPublicKey = KeyFactory.getInstance("RSA")
            .generatePublic(X509EncodedKeySpec(keyBytes))

        val encryptedLocation = LocationEncryptor.encrypt(lat, lng, serverPublicKey)

        val signature = SOSPacketSigner.sign(
            eventId, timestamp, nonce, encryptedLocation.ciphertext, keyPair.private
        )

        val packet = SOSPacket(
            eventId = eventId,
            userId = userId,
            locationEnc = encryptedLocation.ciphertext,
            encKey = encryptedLocation.encKey,
            iv = encryptedLocation.iv,
            timestamp = timestamp,
            nonce = nonce,
            signature = signature
        )

        BLEGattServer(context).start(packet)
        return eventId
    }

    // Returns device public key as Base64 for Firestore registration
    fun getPublicKey(): String = keyManager.getPublicKeyBase64()
}