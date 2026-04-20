package com.roadsos.manet.crypto

import java.security.SecureRandom

object NonceGenerator {

    // Generates a 128-bit random hex nonce for replay prevention
    fun generate(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}