package com.roadsos.manet.crypto

import java.security.PrivateKey
import java.security.Signature
import org.apache.commons.codec.binary.Base64

object SOSPacketSigner {

    private const val ALGORITHM = "SHA256withECDSA"

    // Signs a SOS packet payload using the device's private key
    fun sign(
        eventId: String,
        timestamp: Long,
        nonce: String,
        locationEncCiphertext: String,
        privateKey: PrivateKey
    ): String {
        val payload = "$eventId|$timestamp|$nonce|$locationEncCiphertext"

        val signature = Signature.getInstance(ALGORITHM)
        signature.initSign(privateKey)
        signature.update(payload.toByteArray(Charsets.UTF_8))

        return Base64.encodeBase64String(signature.sign())
    }
}