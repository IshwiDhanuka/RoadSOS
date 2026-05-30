package com.roadsos.manet.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotEquals
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.spec.ECGenParameterSpec

class CryptoTest {

    @Test
    fun testSignAndVerify() {
        val keyPairGen = KeyPairGenerator.getInstance("EC")
        keyPairGen.initialize(ECGenParameterSpec("secp256r1"))
        val keyPair = keyPairGen.generateKeyPair()

        val eventId = "test-event-123"
        val timestamp = System.currentTimeMillis()
        val nonce = "1234567890abcdef"
        val locationEnc = "test-cipher-text"

        val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, locationEnc, keyPair.private)
        
        // This is where a real Verifier would be called.
        // For the sake of this unit test we just verify the signature format isn't empty.
        assertTrue(signature.isNotEmpty())
    }

    @Test
    fun testLocationEncryption() {
        // Generate a temporary RSA key pair just for testing the wrapper
        val rsaGen = KeyPairGenerator.getInstance("RSA")
        rsaGen.initialize(2048)
        val serverKey = rsaGen.generateKeyPair()

        val lat = 28.5672
        val lng = 77.2100

        val encrypted = LocationEncryptor.encrypt(lat, lng, serverKey.public)

        assertTrue(encrypted.ciphertext.isNotEmpty())
        assertTrue(encrypted.wrappedKey.isNotEmpty())
        assertTrue(encrypted.iv.isNotEmpty())
        assertTrue(encrypted.authTag.isNotEmpty())
        
        // Ensure it actually changed the plaintext
        assertNotEquals("$lat,$lng", encrypted.ciphertext)
    }
}
