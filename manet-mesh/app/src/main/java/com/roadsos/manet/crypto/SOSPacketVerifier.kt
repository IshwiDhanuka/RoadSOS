package com.roadsos.manet.crypto

import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import org.apache.commons.codec.binary.Base64

object SOSPacketVerifier {

    private const val ALGORITHM = "SHA256withECDSA"

    // Verifies a signed SOS packet against the sender's public key
    fun verify(
        eventId: String,
        timestamp: Long,
        nonce: String,
        locationEnc: String,
        signatureBase64: String,
        publicKeyBase64: String
    ): Boolean {
        return try {
            val payload = "$eventId|$timestamp|$nonce|$locationEnc"

            val keyBytes = Base64.decodeBase64(publicKeyBase64)
            val keySpec = X509EncodedKeySpec(keyBytes)
            val publicKey: PublicKey = KeyFactory.getInstance("EC").generatePublic(keySpec)

            val signature = Signature.getInstance(ALGORITHM)
            signature.initVerify(publicKey)
            signature.update(payload.toByteArray(Charsets.UTF_8))

            val sigBytes = Base64.decodeBase64(signatureBase64)
            signature.verify(sigBytes)

        } catch (e: Exception) {
            false
        }
    }
}