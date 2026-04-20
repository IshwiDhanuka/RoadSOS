package com.roadsos.manet.crypto

import com.google.gson.Gson

// The core data structure passed between devices via BLE GATT

data class SOSPacket(
    val eventId: String,        // UUID v4 — unique per SOS event
    val userId: String,         // SHA-256 of device ID — identifies sender
    val locationEnc: String,    // AES-256-GCM encrypted "lat,lng" — base64
    val encKey: String,         // AES key wrapped with server RSA public key — base64
    val iv: String,             // AES-GCM IV — base64
    val timestamp: Long,        // epoch ms — when SOS was triggered
    val nonce: String,          // 128-bit random hex — replay prevention
    val signature: String,      // ECDSA-P256 signature — base64
    val hopCount: Int = 0,      // 0 = origin device, max 5
    val relayChain: List<RelayHop> = emptyList()  // audit trail of relay path
) {
    // Serialize to JSON string for BLE GATT transfer
    fun toJson(): String = Gson().toJson(this)

    companion object {
        // Deserialize from JSON string received via BLE GATT
        fun fromJson(json: String): SOSPacket = Gson().fromJson(json, SOSPacket::class.java)
    }
}

// Appended by each relay node to prove it handled the packet
data class RelayHop(
    val nodeId: String,   // SHA-256 of relay device ID
    val hopSig: String,   // ECDSA over "eventId|hopIndex|ts"
    val ts: Long          // epoch ms when this relay handled the packet
)