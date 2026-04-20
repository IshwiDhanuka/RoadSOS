package com.roadsos.manet.crypto

import android.util.Base64
import java.security.PublicKey
import javax.crypto.Cipher
import javax.crypto.KeyGenerator

data class EncryptedLocation(
    val ciphertext: String,
    val encKey: String,
    val iv: String
)

object LocationEncryptor {

    private const val AES_MODE = "AES/GCM/NoPadding"
    private const val RSA_MODE = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"

    // Encrypts GPS coordinates using AES-GCM, wraps key with server RSA public key
    fun encrypt(lat: Double, lng: Double, serverPublicKey: PublicKey): EncryptedLocation {
        val aesKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()

        val aesCipher = Cipher.getInstance(AES_MODE)
        aesCipher.init(Cipher.ENCRYPT_MODE, aesKey)
        val iv = aesCipher.iv
        val ciphertext = aesCipher.doFinal("$lat,$lng".toByteArray(Charsets.UTF_8))

        val rsaCipher = Cipher.getInstance(RSA_MODE)
        rsaCipher.init(Cipher.ENCRYPT_MODE, serverPublicKey)
        val encryptedKey = rsaCipher.doFinal(aesKey.encoded)

        return EncryptedLocation(
            ciphertext = Base64.encodeToString(ciphertext, Base64.NO_WRAP),
            encKey = Base64.encodeToString(encryptedKey, Base64.NO_WRAP),
            iv = Base64.encodeToString(iv, Base64.NO_WRAP)
        )
    }
}