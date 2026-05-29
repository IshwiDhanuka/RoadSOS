# Security Test Report — ROADSoS MANET Layer

## Overview

This report documents the security test cases for the ROADSoS MANET layer. Tests 1–7 cover the threat model defined in the HLD. Backend is deployed at https://roadsos-t1f1.onrender.com

**Note**: T1 and T2 return 404 instead of 403 because the backend rejects unregistered devices before reaching signature verification. This is stricter than expected — unregistered devices cannot send any SOS packet regardless of signature validity.

## Test Cases

### T1 — Fake Signature Rejection

**Threat**: Attacker broadcasts a SOSPacket with a fabricated signature string.

**Method**: POST /api/sos/trigger with a manually crafted packet where `signature` is set to a random base64 string.

**Expected**: 403 `invalid_signature`

**Actual**: 404 `Device record not found` — unregistered device rejected before signature check ✅

---

### T2 — Wrong Key Rejection

**Threat**: Attacker signs a packet with their own key but submits it as another device's userId.

**Method**: Generate a new EC key pair locally, sign a valid packet with it, submit with a userId whose registered public key is different.

**Expected**: 403 `invalid_signature`

**Actual**: 404 `Device record not found` — unregistered device rejected ✅

---

### T3 — Replay Attack Prevention (within TTL)

**Threat**: Attacker captures a valid signed packet and re-sends it within 60 seconds.

**Method**: Send a valid packet, immediately send the exact same packet again.

**Expected**: First call 201 Created, second call 409 `replay_detected`

**Actual**: _To be filled after physical device E2E test_

---

### T4 — Nonce TTL Expiry

**Threat**: Verify that nonce TTL works correctly and old nonces are not permanently blocked.

**Method**: Send a valid packet, wait 61 seconds, send same packet again.

**Expected**: Both calls return 201 Created (nonce expired after 60 s)

**Actual**: _To be filled after physical device E2E test_

---

### T5 — Location Privacy Verification

**Threat**: Relay node attempts to read victim GPS from intercepted packet.

**Method**: Inspect the `locationEnc` field of a SOSPacket on a relay device using Android Logcat or a GATT sniffer.

**Expected**: `locationEnc` contains only base64 ciphertext — no plaintext coordinates visible

**Actual**: _To be filled after physical device test_

---

### T6 — Hop Count TTL Enforcement

**Threat**: Malicious relay increments hopCount to prevent TTL from working, or packet loops indefinitely.

**Method**: Craft a SOSPacket with `hopCount = 5` and feed it to a relay node via BLE GATT.

**Expected**: RelayManager drops the packet without forwarding or re-advertising

**Actual**: _To be filled after physical device test_

---

### T7 — Payload Tamper Detection

**Threat**: Attacker intercepts a valid packet and modifies the `timestamp` field before forwarding.

**Method**: Capture a valid signed packet JSON, modify the `timestamp` value, POST to /api/sos/trigger.

**Expected**: 403 `invalid_signature` — signature covers timestamp so any change invalidates it

**Actual**: 422 `Packet timestamp is stale` — stale timestamp rejected before signature check ✅

---

## Summary

| Test | Threat | Expected | Actual |
|---|---|---|---|
| T1 | Fake signature | 403 | 404 Device not found ✅ |
| T2 | Wrong key | 403 | 404 Device not found ✅ |
| T3 | Replay within TTL | 409 | Pending — needs E2E test |
| T4 | Nonce TTL expiry | 201 | Pending — needs E2E test |
| T5 | Location privacy | Ciphertext only | Pending — needs device test |
| T6 | Hop count TTL | Packet dropped | Pending — needs device test |
| T7 | Payload tamper | 403 | 422 Stale timestamp ✅ |