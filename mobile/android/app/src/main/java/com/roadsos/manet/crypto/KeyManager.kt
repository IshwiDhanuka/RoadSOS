package com.roadsos.manet.crypto



import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey

class KeyManager(private val context: Context) {

    companion object {
        private const val KEY_ALIAS = "roadsos_device_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    }

    // Gets existing key pair or creates a new one if first launch
    // Why: We need a stable ECDSA key pair per device for signing SOS packets
    // The Android KeyStore stores it securely in hardware (TEE) — never exposed to app memory
    fun getOrCreateKeyPair(): KeyPair {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

        // If key already exists, just return it
        if (keyStore.containsAlias(KEY_ALIAS)) {
            val privateKey = keyStore.getKey(KEY_ALIAS, null) as PrivateKey
            val publicKey = keyStore.getCertificate(KEY_ALIAS).publicKey
            return KeyPair(publicKey, privateKey)
        }

        // First launch — generate new EC P-256 key pair
        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE
        )

        val parameterSpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()

        keyPairGenerator.initialize(parameterSpec)
        return keyPairGenerator.generateKeyPair()
    }

    // Returns public key as Base64 string for uploading to Firestore
    fun getPublicKeyBase64(): String {
        val keyPair = getOrCreateKeyPair()
        return android.util.Base64.encodeToString(
            keyPair.public.encoded,
            android.util.Base64.NO_WRAP
        )
    }
}