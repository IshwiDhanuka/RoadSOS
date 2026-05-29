# RoadSOS Backend

RoadSOS is a secure, resilient emergency response and nearby services locator backend. It is designed to operate under constrained network conditions using a hybrid architecture that supports direct internet reporting, offline caching, and Mobile Ad-Hoc Network (MANET) mesh relay verification.

The backend is built with **Node.js (>=20.0.0)**, **Express**, **TypeScript (ESNext)**, and integrates with **Firebase (Admin SDK)**, **Upstash Redis (REST API)**, and **Google Places API (New)**.

---

## Table of Contents
1. [Architecture & Directory Layout](#architecture--directory-layout)
2. [Core Features](#core-features)
   - [Emergency SOS & Mesh Relaying](#1-emergency-sos--mesh-relaying)
   - [Nearby Emergency Services Lookup](#2-nearby-emergency-services-lookup)
   - [Service Search](#3-service-search)
   - [Accident Reporting](#4-accident-reporting)
   - [Offline Mode Bundles](#5-offline-mode-bundles)
   - [Push Notifications (FCM)](#6-push-notifications-fcm)
3. [Security Internals & Cryptography](#security-internals--cryptography)
4. [Cost Optimization Strategies](#cost-optimization-strategies)
5. [API Endpoint Reference](#api-endpoint-reference)
6. [Environment Configuration (`.env`)](#environment-configuration-env)
7. [Local Development & Commands](#local-development--commands)
8. [Production Build & Render.com Deployment](#production-build--rendercom-deployment)

---

## Architecture & Directory Layout

The codebase follows a modular Controller-Service pattern:

```
backend/
├── dist/                          # Compiled JavaScript outputs
├── src/
│   ├── config/                    # Initialization of external clients/env
│   │   ├── env.ts                 # Zod-validated environment config
│   │   ├── firebase.ts            # Firebase Admin SDK (Auth, Firestore, FCM)
│   │   └── redis.ts               # Upstash Redis serverless client
│   ├── controllers/               # Express request/response handlers
│   │   ├── offlineController.ts   # Gzip bundle compiler
│   │   ├── reportController.ts    # Public incident submission
│   │   ├── servicesController.ts  # Places query & deduplication
│   │   └── sosController.ts       # SOS validation & Mesh relay processing
│   ├── interfaces/                # Shared TypeScript structures/types
│   ├── middleware/                # Express middleware
│   │   ├── auth.ts                # Firebase JWT Bearer token validator
│   │   └── errorHandler.ts        # Global operational error boundaries
│   ├── routes/                    # API route definitions
│   ├── services/                  # Business logic & external API clients
│   │   ├── cacheService.ts        # Geohash computation & Redis caching
│   │   ├── cryptoService.ts       # RSA decryption, AES location decrypt, ECDSA verification
│   │   ├── fcmService.ts          # Geo-targeted push notifications
│   │   └── placesService.ts       # Google Places API Client
│   ├── app.ts                     # Express App assembly (CORS, Helmet, Rate Limiter)
│   └── server.ts                  # Server bootsrap (loads env -> connects db -> listens)
├── package.json                   # Dependency definitions & scripts
└── tsconfig.json                  # TypeScript compiler options
```

---

## Core Features

### 1. Emergency SOS & Mesh Relaying
Processes direct and relayed SOS alerts. In a disaster or offline scenario, mobile clients broadcast SOS packets locally via Bluetooth/Wi-Fi Direct. When any peer node in the mesh obtains internet access, it relays the SOS packet chain to this backend.
- **Relay Chain Verification**: Iterates through the hops in the relay packet. The backend resolves the public key for every intermediate node from Firestore and verifies that each node signed the message payload `(eventId|hopIndex|timestamp)`.
- **Replay Protection**: Enforces timestamp checks (rejects packets drifting `> 60s` from server time) and records a single-use 128-bit hex nonce in Firestore.

### 2. Nearby Emergency Services Lookup
Retrieves nearby hospitals, police stations, fire stations, mechanics, fuel stations, and pharmacies.
- **Deduplication Engine**: Merges Google Places API results with trusted local listings seeded in Firestore. It uses `fuse.js` fuzzy matching (threshold 0.3) along with distance calculations (Euclidean projection < 200m). When duplicates are detected, it discards the unverified Google result in favor of the verified Firestore record.
- **Redis Caching**: Geohashes coordinates into a precision-6 cell (~1.2 km). Missed queries compile results, send them to the client, and save them in Upstash Redis under the geohash cache key with a 30-minute TTL.

### 3. Service Search
Allows text querying (e.g. `"icu emergency"`, `"towing service"`) biased around the caller's coordinates and search radius. It calls the Google Places Text Search API and yields sorted results by distance.

### 4. Accident Reporting
Authenticated users can submit road incidents (e.g. crashes, roadblocks). The backend stores the coordinates and details in Firestore and multicasts push notifications to users currently registered inside the ~1.2 km geohash area.

### 5. Offline Mode Bundles
Computes a precision-4 geohash (~20 km cell) along with its 8 neighboring cells (covering a ~20 km radius). It extracts up to 50 verified services from the local Firestore seed dataset, compiles them into an `OfflineBundle` JSON, and yields a **gzip-compressed payload** (`Content-Encoding: gzip`) with cache headers (`Cache-Control: private, max-age=3600`) to minimize download overhead and client storage requirements.

### 6. Push Notifications (FCM)
Sends targeted push alerts. By listening to location updates from the mobile clients, Firestore keeps a registry of registration tokens indexed by precision-6 geohashes. The backend resolves device tokens in the sender's current geohash cell + adjacent cells (up to 10 cells) and broadcasts a multicast alert through Firebase Cloud Messaging.

---

## Security Internals & Cryptography

To guarantee authenticity and protect victim locations, RoadSOS implements a multi-layered security protocol:

```mermaid
sequenceDiagram
    autonumber
    actor Victim Device
    actor Mesh Relay Node
    participant Server (RoadSOS)
    participant Database (Firestore)

    Victim Device->>Victim Device: Encrypt coordinates: AES-256-GCM (random session key)
    Victim Device->>Victim Device: Wrap session key: RSA-2048-OAEP (Server Public Key)
    Victim Device->>Victim Device: Sign Packet: ECDSA-P256 (Victim Private Key)
    Victim Device->>Mesh Relay Node: Broadcast offline packet
    Mesh Relay Node->>Mesh Relay Node: Add hop and Sign: ECDSA-P256 (Relay Private Key)
    Mesh Relay Node->>Server (RoadSOS): POST /api/mesh/relay
    Server (RoadSOS)->>Server (RoadSOS): Validate timestamp drift <= 60 seconds
    Server (RoadSOS)->>Database (Firestore): Query victim & relay public keys
    Database (Firestore)-->>Server (RoadSOS): Return PEM Public Keys
    Server (RoadSOS)->>Server (RoadSOS): Verify ECDSA signatures for all hops & victim
    Server (RoadSOS)->>Database (Firestore): Claim 128-bit Nonce
    Note over Server (RoadSOS),Database (Firestore): Throws 409 if nonce is already registered
    Server (RoadSOS)->>Server (RoadSOS): Decrypt wrapped AES key (Server Private Key)
    Server (RoadSOS)->>Server (RoadSOS): Decrypt coordinates with session key (AES-GCM)
    Server (RoadSOS)->>Database (Firestore): Save SOSEvent (status: active)
    Server (RoadSOS)->>Server (RoadSOS): Broadcast FCM Multicast to nearby tokens
```

### Cryptographic Details
*   **Packet Integrity / Identity**: Checked using **ECDSA-P256** (with SHA-256). Every client must register their public key PEM in Firestore on account creation.
*   **Asymmetric Key Wrapping**: The random 32-byte AES key used for GCM is wrapped on-device using **RSA-2048-OAEP** with SHA-256. The server decrypts it using its private key (`RSA_PRIVATE_KEY_B64`).
*   **Payload Encryption**: Location coordinates are encrypted using **AES-256-GCM**, protecting user privacy from intermediate relay nodes. The authentication tag ensures the location cannot be altered.

---

## Cost Optimization Strategies

Since RoadSOS is designed to operate within free/low-tier limits, we apply several resource-saving structures:

1.  **Google Places API Field Masking**:
    Instead of fetching default datasets (which incur high-tier fees), we configure a strict field mask:
    `places.id,places.displayName,places.formattedAddress,places.location,places.types`
    By removing contact details (e.g. `nationalPhoneNumber`) and atmosphere characteristics (e.g. `rating`), requests are classified under the **Basic / Pro tier** instead of Enterprise. This boosts free monthly queries from **~7,000 to ~35,000 requests**.
2.  **Geohash Caching via Upstash**:
    Redundant requests within the same geohash-6 (~1.2 km area) bypass the Google Places API completely. They serve cached data from Upstash Redis, saving credit.
3.  **Firestore Query Pruning**:
    Offline bundle builds query Firestore subcollections bounded strictly to precision-4 geohashes (approx 20 km) with limits (`limit(50)`), avoiding full collection table scans.

---

## API Endpoint Reference

### Public Endpoints

#### 1. Server Health Check
*   **Method**: `GET`
*   **Path**: `/health`
*   **Response**: `200 OK`
    ```json
    {
      "status": "ok",
      "uptime": 124.5,
      "timestamp": "2026-05-25T07:50:00.000Z"
    }
    ```

#### 2. Get Nearby Services
Queries cached Redis/live APIs for nearby emergency responders.
*   **Method**: `GET`
*   **Path**: `/api/services/nearby`
*   **Query Parameters**:
    *   `lat`: float (Required, -90 to 90)
    *   `lng`: float (Required, -180 to 180)
    *   `radius`: integer (Optional, default `5000` meters)
*   **Response**: `200 OK`
    ```json
    {
      "source": "live",
      "services": [
        {
          "id": "ChIJu...",
          "name": "City General Hospital",
          "category": "hospital",
          "lat": 26.9124,
          "lng": 75.7873,
          "address": "Jawahar Lal Nehru Marg, Jaipur",
          "source": "google",
          "isVerified": false,
          "distanceMetres": 850
        }
      ]
    }
    ```

#### 3. Search Services
Search emergency services using keywords.
*   **Method**: `GET`
*   **Path**: `/api/services/search`
*   **Query Parameters**:
    *   `q`: string (Required)
    *   `lat`: float (Required)
    *   `lng`: float (Required)
    *   `radius`: integer (Optional, default `5000`)
    *   `category`: string (Optional)

#### 4. Trigger Direct SOS
Submit a signed, encrypted SOS packet from a device with active connectivity.
*   **Method**: `POST`
*   **Path**: `/api/sos/trigger`
*   **Body**: `SOSPacket`
*   **Response**: `201 Created`
    ```json
    {
      "eventId": "3c85a060-e4b0-4c81-817f-b88a8d11de41",
      "status": "active"
    }
    ```

#### 5. Relay Mesh SOS
Relay emergency packets collected offline through a node chain.
*   **Method**: `POST`
*   **Path**: `/api/mesh/relay`
*   **Rate Limit**: Capped at `20 req/min`
*   **Body**: `SOSPacket` containing a non-empty `relayChain`.
*   **Response**: `201 Created`
    ```json
    {
      "eventId": "3c85a060-e4b0-4c81-817f-b88a8d11de41",
      "relayHops": 3,
      "status": "active"
    }
    ```

---

### Authenticated Endpoints (Requires `Authorization: Bearer <idToken>`)

#### 6. Resolve SOS Status
Mark an active emergency event as resolved.
*   **Method**: `PATCH`
*   **Path**: `/api/sos/:id/status`
*   **Body**:
    ```json
    {
      "status": "resolved"
    }
    ```

#### 7. Report Road Accident
Log an accident or road blockage.
*   **Method**: `POST`
*   **Path**: `/api/report/accident`
*   **Body**:
    ```json
    {
      "lat": 26.9124,
      "lng": 75.7873,
      "description": "Tree fallen blocking two lanes on highway."
    }
    ```

#### 8. Download Offline Bundle
Download compressed emergency listings within a ~20 km radius for offline storage.
*   **Method**: `GET`
*   **Path**: `/api/offline/bundle`
*   **Query Parameters**: `lat`, `lng`
*   **Headers Returned**: `Content-Encoding: gzip`

---

## Environment Configuration (`.env`)

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
# Use literal \n inside string for newlines in the private key PEM
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ..."

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Server Cryptography Keys
# Base64 encoded RSA 2048 PKCS8 private key
RSA_PRIVATE_KEY_B64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2Z0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktnd2dnU2tBZ0VBQW9JQkFRRGJzK240WmtJZwp...
```

---

## Local Development & Commands

Run commands from the `backend/` directory:

```bash
# Install dependencies
npm install

# Run backend in hot-reload watch mode (reads environment from .env)
npm run dev

# Run TypeScript compiler (generates dist/)
npm run build

# Run linting
npm run lint

# Run Jest tests
npm run test
```

---

## Production Build & Render.com Deployment

When deploying to a hosting provider such as Render.com, configure the following options:

1.  **Repository Setup**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Node Version**: `>=20.0.0`
2.  **Environment Variables**:
    Replicate all `.env` variables in Render's dashboard.
    *   *Note*: Paste `FIREBASE_PRIVATE_KEY` with literal `\n` characters exactly as exported from your Firebase JSON credential. The server replaces `\\n` with standard carriage returns during bootstrap.
3.  **TSConfig Resolution**:
    The production build compiles ESNext ESM files. The startup script `npm start` executes `tsx dist/server.js` to run compiled ESM files natively, bypassing extension requirements.
