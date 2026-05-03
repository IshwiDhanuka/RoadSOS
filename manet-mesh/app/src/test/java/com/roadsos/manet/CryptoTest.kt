package com.roadsos.manet

import com.roadsos.manet.crypto.*
import org.apache.commons.codec.binary.Base64
import org.junit.Assert.*
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.SecureRandom

class CryptoTest {

    private fun generateTestKeyPair() = KeyPairGenerator.getInstance("EC").apply {
        initialize(256, SecureRandom())
    }.generateKeyPair()

    @Test
    fun signAndVerifyWithSameKeyShouldPass() {
        val keyPair = generateTestKeyPair()
        val eventId = "test-event-123"
        val timestamp = System.currentTimeMillis()
        val nonce = NonceGenerator.generate()
        val locationEnc = "encryptedLocationBase64"

        val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, locationEnc, keyPair.private)
        val publicKeyBase64 = Base64.encodeBase64String(keyPair.public.encoded)

        val result = SOSPacketVerifier.verify(eventId, timestamp, nonce, locationEnc, signature, publicKeyBase64)
        assertTrue(result)
    }

    @Test
    fun verifyWithWrongKeyShouldFail() {
        val signingKeyPair = generateTestKeyPair()
        val wrongKeyPair = generateTestKeyPair()
        val eventId = "test-event-123"
        val timestamp = System.currentTimeMillis()
        val nonce = NonceGenerator.generate()
        val locationEnc = "encryptedLocationBase64"

        val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, locationEnc, signingKeyPair.private)
        val wrongPublicKeyBase64 = Base64.encodeBase64String(wrongKeyPair.public.encoded)

        val result = SOSPacketVerifier.verify(eventId, timestamp, nonce, locationEnc, signature, wrongPublicKeyBase64)
        assertFalse(result)
    }

    @Test
    fun tamperedPayloadShouldFailVerification() {
        val keyPair = generateTestKeyPair()
        val eventId = "test-event-123"
        val timestamp = System.currentTimeMillis()
        val nonce = NonceGenerator.generate()
        val locationEnc = "encryptedLocationBase64"

        val signature = SOSPacketSigner.sign(eventId, timestamp, nonce, locationEnc, keyPair.private)
        val publicKeyBase64 = Base64.encodeBase64String(keyPair.public.encoded)

        val result = SOSPacketVerifier.verify(eventId, timestamp, nonce, "tamperedLocation", signature, publicKeyBase64)
        assertFalse(result)
    }

    @Test
    fun nonceShouldBeUniqueAndCorrectLength() {
        val nonce1 = NonceGenerator.generate()
        val nonce2 = NonceGenerator.generate()
        assertNotEquals(nonce1, nonce2)
        assertEquals(32, nonce1.length)
    }

    @Test
    fun sosPacketShouldSerializeAndDeserializeCorrectly() {
        val encLoc = EncryptedLocation(
            ciphertext = "encLoc",
            wrappedKey = "wrappedKey",
            iv = "iv",
            authTag = "authTag"
        )
        val packet = SOSPacket(
            eventId = "evt-001",
            userId = "user-hash-001",
            locationEnc = encLoc,
            timestamp = 1234567890L,
            nonce = "abc123",
            signature = "sig"
        )
        val json = packet.toJson()
        val restored = SOSPacket.fromJson(json)
        assertEquals(packet, restored)
    }}