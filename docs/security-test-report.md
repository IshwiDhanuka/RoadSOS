# Security Test Report — ROADSoS MANET Layer

## Overview

This report documents the security test cases for the ROADSoS MANET layer. Tests 1–7 cover the threat model defined in the HLD. Actual results will be filled in after backend deployment.

## Test Cases

### T1 — Fake Signature Rejection

**Threat**: Attacker broadcasts a SOSPacket with a fabricated signature string.

**Method**: POST /api/sos/trigger with a manually crafted packet where `signature` is set to a random base64 string.

**Expected**: 403 `invalid_signature`

**Actual**: _To be filled after backend deployment_

---

### T2 — Wrong Key Rejection

**Threat**: Attacker signs a packet with their own key but submits it as another device's userId.

**Method**: Generate a new EC key pair locally, sign a valid packet with it, submit with a userId whose registered public key is different.

**Expected**: 403 `invalid_signature`

**Actual**: _To be filled after backend deployment_

---

### T3 — Replay Attack Prevention (within TTL)

**Threat**: Attacker captures a valid signed packet and re-sends it within 60 seconds.

**Method**: Send a valid packet, immediately send the exact same packet again.

**Expected**: First call 201 Created, second call 409 `replay_detected`

**Actual**: _To be filled after backend deployment_

---

### T4 — Nonce TTL Expiry

**Threat**: Verify that nonce TTL works correctly and old nonces are not permanently blocked.

**Method**: Send a valid packet, wait 61 seconds, send same packet again.

**Expected**: Both calls return 201 Created (nonce expired after 60 s)

**Actual**: _To be filled after backend deployment_

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

**Actual**: _To be filled after backend deployment_

---

## Summary

| Test | Threat | Expected | Actual |
|---|---|---|---|
| T1 | Fake signature | 403 | Pending |
| T2 | Wrong key | 403 | Pending |
| T3 | Replay within TTL | 409 | Pending |
| T4 | Nonce TTL expiry | 201 | Pending |
| T5 | Location privacy | Ciphertext only | Pending |
| T6 | Hop count TTL | Packet dropped | Pending |
| T7 | Payload tamper | 403 | Pending |