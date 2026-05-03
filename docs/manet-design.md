

# MANET Layer Design — ROADSoS

## 1. Overview

ROADSoS uses a Mobile Ad-hoc Network (MANET) built on Bluetooth Low Energy (BLE) GATT and Wi-Fi Direct to relay signed SOS packets between Android devices when internet connectivity is unavailable. This document covers the mesh architecture, GATT protocol, security model, and mapping to VanSec course concepts.

## 2. Why MANET

Road accidents frequently occur in low-connectivity zones — rural highways, tunnels, and areas with overloaded cell towers. A victim's phone may have no internet at the moment help is needed most. MANET solves this by using nearby bystander phones as relay nodes, forwarding a signed SOS packet hop-by-hop until a device with internet connectivity is reached and can notify the backend.

## 3. Mesh Architecture

### 3.1 Node Types

- **Origin node**: victim's device, has no internet, initiates SOS
- **Relay node**: bystander's nearby device, forwards packet
- **Exit node**: first relay node with internet, posts to backend

### 3.2 Transport Layers

| Transport | Range | Used When |
|---|---|---|
| BLE GATT | 10–50 m | Primary — always attempted first |
| Wi-Fi Direct | ~200 m | Fallback — if no BLE peers found in 10 s |

### 3.3 Hop Limit

Each packet carries a `hopCount` field starting at 0. Every relay node increments it before re-advertising. If `hopCount >= 5` the packet is dropped. This prevents infinite relay loops and limits network flooding.

## 4. BLE GATT Protocol

### 4.1 Service Definition

- **Service UUID**: `0000abcd-0000-1000-8000-00805f9b34fb`
- **Characteristic UUID**: `0000dcba-0000-1000-8000-00805f9b34fb`
- **Characteristic property**: READ
- **Payload**: SOSPacket serialized as UTF-8 JSON

### 4.2 Connection Flow

```
Origin Device (no internet)
  │
  ├── Starts BLEGattServer
  ├── Advertises ROADSoS service UUID
  │
Relay Device (nearby)
  ├── BLEGattClient scans for UUID
  ├── Connects to GATT server
  ├── Reads SOSPacket characteristic
  ├── Disconnects
  ├── Verifies ECDSA signature
  ├── Checks nonce LRU cache
  │
  ├── Has internet → POST /api/mesh/relay to backend
  └── No internet → starts own BLEGattServer, re-advertises (hopCount++)
```

## 5. SOSPacket Schema

```
eventId     : String   — UUID v4, unique per SOS event
userId      : String   — SHA-256 of device Android ID
locationEnc : String   — AES-256-GCM encrypted "lat,lng", base64
encKey      : String   — AES key wrapped with server RSA-2048-OAEP, base64
iv          : String   — AES-GCM IV, base64
timestamp   : Long     — epoch ms
nonce       : String   — 128-bit SecureRandom hex
signature   : String   — ECDSA-P256 over "eventId|timestamp|nonce|locationEnc"
hopCount    : Int      — 0 = origin, max 5
relayChain  : List     — RelayHop entries appended by each relay node
```

## 6. Security Model

### 6.1 Packet Authentication

Every SOSPacket is signed using ECDSA-P256. The signing key is generated at first app launch and stored in the Android KeyStore (TEE-backed hardware where available). The public key is registered in Firestore at first launch. The backend and relay nodes verify the signature before processing any packet.

### 6.2 Replay Prevention

Each packet includes a 128-bit cryptographically random nonce generated using `SecureRandom`. The backend stores each seen nonce in Firestore with a 60-second TTL. Relay nodes maintain a 500-entry LRU cache of seen nonces with a 60-second TTL. Any packet with a previously seen nonce is dropped immediately.

### 6.3 Location Privacy

GPS coordinates are never transmitted in plaintext. The origin device generates an ephemeral AES-256 key per SOS event, encrypts the coordinates using AES-GCM, and wraps the AES key using the server's RSA-2048-OAEP public key (pinned in the APK at build time). Relay nodes forward only the encrypted blob and have no way to recover the plaintext location.

### 6.4 Hop Chain Integrity

Each relay node appends a `RelayHop` to the packet's `relayChain` containing its node ID and an ECDSA signature over `"eventId|hopIndex|timestamp"` using its own KeyStore key. The backend verifies every hop signature against the corresponding device's registered public key, producing a tamper-evident audit trail of every device the packet passed through.

## 7. VanSec Concept Mapping

| VanSec Concept | VANET Standard | ROADSoS MANET Implementation |
|---|---|---|
| Ad-hoc network topology | WAVE / DSRC beacon mesh | BLE GATT + Wi-Fi Direct hop-limited mesh |
| Node authentication / PKI | IEEE 1609.2 certs + CA | Android KeyStore ECDSA-P256 key pairs |
| Message integrity | Signed BSM | ECDSA-P256 signed SOSPacket |
| Replay prevention | Sequence numbers + timestamps | 128-bit nonce + 60 s TTL + LRU cache |
| Location privacy | Pseudonym certificate rotation | AES-256-GCM + RSA-OAEP key wrapping |
| Trust chain / provenance | Certificate chain to root CA | Relay hop-chain signatures |
| Sybil resistance | Hardware TPM attestation | Android KeyStore attestation |

## 8. Future Work — VANET Upgrade Path

When V2X-capable hardware becomes available in Indian vehicles, the MANET layer can be upgraded to full VANET by replacing `BLEGattServer.kt` and `BLEGattClient.kt` with a V2X transceiver module implementing IEEE 802.11p or C-V2X. All cryptographic logic (ECDSA signing, AES encryption, nonce generation, hop-chain management) remains unchanged. The React Native bridge and backend verification are also unaffected.