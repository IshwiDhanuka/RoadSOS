package com.roadsos.manet.crypto

import com.google.gson.Gson

data class SOSPacket(
    val eventId: String,
    val userId: String,
    val locationEnc: EncryptedLocation,  // object not string
    val timestamp: Long,
    val nonce: String,
    val signature: String,
    val hopCount: Int = 0,
    val relayChain: List<RelayHop> = emptyList()
) {
    fun toJson(): String = Gson().toJson(this)

    companion object {
        fun fromJson(json: String): SOSPacket = Gson().fromJson(json, SOSPacket::class.java)
    }
}

data class RelayHop(
    val nodeId: String,
    val hopSig: String,
    val ts: Long
)