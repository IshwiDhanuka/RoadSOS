package com.roadsos.manet.crypto

import android.util.Base64
import java.security.PublicKey
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

data class EncryptedLocation(
    val ciphertext: String,  // base64 AES-GCM ciphertext (without auth tag)
    val wrappedKey: String,  // base64 AES key wrapped with server RSA public key
    val iv: String,          // base64 AES-GCM IV
    val authTag: String      // base64 AES-GCM auth tag (last 16 bytes)
)

object LocationEncryptor {

    private const val AES_MODE = "AES/GCM/NoPadding"
    private const val RSA_MODE = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"
    private const val GCM_TAG_LENGTH = 128

    // Encrypts GPS coordinates using AES-GCM, wraps key with server RSA public key
    fun encrypt(lat: Double, lng: Double, serverPublicKey: PublicKey): EncryptedLocation {
        val aesKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()

        val aesCipher = Cipher.getInstance(AES_MODE)
        val paramSpec = GCMParameterSpec(GCM_TAG_LENGTH, ByteArray(12).also {
            java.security.SecureRandom().nextBytes(it)
        })
        aesCipher.init(Cipher.ENCRYPT_MODE, aesKey, paramSpec)

        val plaintext = "$lat,$lng".toByteArray(Charsets.UTF_8)
        val ciphertextWithTag = aesCipher.doFinal(plaintext)
        val iv = aesCipher.iv

        // AES-GCM appends 16-byte auth tag at the end
        val ciphertext = ciphertextWithTag.copyOfRange(0, ciphertextWithTag.size - 16)
        val authTag = ciphertextWithTag.copyOfRange(ciphertextWithTag.size - 16, ciphertextWithTag.size)

        val rsaCipher = Cipher.getInstance(RSA_MODE)
        rsaCipher.init(Cipher.ENCRYPT_MODE, serverPublicKey)
        val wrappedKey = rsaCipher.doFinal(aesKey.encoded)

        return EncryptedLocation(
            ciphertext = Base64.encodeToString(ciphertext, Base64.NO_WRAP),
            wrappedKey = Base64.encodeToString(wrappedKey, Base64.NO_WRAP),
            iv = Base64.encodeToString(iv, Base64.NO_WRAP),
            authTag = Base64.encodeToString(authTag, Base64.NO_WRAP)
        )
    }
}