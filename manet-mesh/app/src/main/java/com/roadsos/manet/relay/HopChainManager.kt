package com.roadsos.manet.relay

import com.roadsos.manet.crypto.SOSPacket
import com.roadsos.manet.crypto.SOSPacketSigner
import com.roadsos.manet.crypto.SOSPacketVerifier
import com.roadsos.manet.crypto.RelayHop
import java.security.KeyPair
import org.apache.commons.codec.binary.Base64

object HopChainManager {

    private const val MAX_HOPS = 5

    // Returns false if packet has exceeded max hops
    fun canRelay(packet: SOSPacket): Boolean = packet.hopCount < MAX_HOPS

    // Appends this relay node's signed hop to the relay chain
    fun appendHop(packet: SOSPacket, nodeId: String, keyPair: KeyPair): SOSPacket {
        val hopIndex = packet.relayChain.size
        val ts = System.currentTimeMillis()
        val hopPayload = "${packet.eventId}|$hopIndex|$ts"

        val hopSig = SOSPacketSigner.sign(
            packet.eventId, ts, hopIndex.toString(), hopPayload, keyPair.private
        )

        val hop = RelayHop(nodeId = nodeId, hopSig = hopSig, ts = ts)

        return packet.copy(
            hopCount = packet.hopCount + 1,
            relayChain = packet.relayChain + hop
        )
    }

    // Verifies all hop signatures in the relay chain
    fun verifyChain(packet: SOSPacket, publicKeys: Map<String, String>): Boolean {
        return packet.relayChain.mapIndexed { index, hop ->
            val pubKey = publicKeys[hop.nodeId] ?: return false
            val hopPayload = "${packet.eventId}|$index|${hop.ts}"
            SOSPacketVerifier.verify(
                packet.eventId, hop.ts, index.toString(), hopPayload, hop.hopSig, pubKey
            )
        }.all { it }
    }
}