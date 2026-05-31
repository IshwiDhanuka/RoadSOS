# RoadSOS
**Hackathon Final Submission**

RoadSOS is a decentralized, mobile-first emergency response application designed for areas with zero cellular connectivity. By utilizing a Bluetooth Mobile Ad-Hoc Network (MANET), RoadSOS ensures that panic signals can hop securely from device to device until they reach the internet. 

## Core Features

- **Offline MANET Mesh:** Built with a custom native Android TurboModule, our app leverages BLE GATT servers to broadcast and relay SOS packets completely offline.
- **Dynamic Services Map:** Seamlessly plots nearby hospitals, police stations, towing services, and ambulances on a Google Map interface using our custom API.
- **Offline Mock Fallback:** If the API endpoint dies or connectivity is lost, the Map and Search interfaces instantly degrade gracefully to a highly realistic mock dataset so first responders are never left in the dark.
- **Interactive First Aid Guide:** Built-in offline accordion guides for CPR (with tempo cues), severe bleeding, and spinal injuries.
- **Premium UX Design:** Overhauled with beautiful dark-mode theming and responsive interactions for stressful situations.

## Repository Structure

- `/mobile` - The React Native front-end application built for Android. Contains our custom Kotlin BLE bridge (`MANETModule`).
- `/frontend` - Contains Web/Frontend assets and the initial `apiService` logic.
- `/backend` - The Node.js server designed to ingest the SOS payloads.
- `HLD.txt` - The High Level Design specification guiding our Hackathon architectural choices.
- `RoadSOS-App.apk` - The compiled, fully-functional Android App bundle you can install right now.

## Usage & Setup Instructions

### 1. The Mobile App (Android)
The final production-grade Debug APK is located at `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
You can directly install the app using the provided APK file:
```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```
*Note for Developers:* If you are building the app from source, you **must** supply your own Google Maps API Key. 
Open `mobile/android/app/src/main/AndroidManifest.xml` and ensure the API key is present, otherwise the map tiles will not render.

### 2. The Bluetooth MANET Setup
To test the offline mesh:
1. Ensure your device is running Android 12 or higher.
2. Open the app and grant the requested **Location** and **Nearby Devices** permissions.
3. Turn off your Wi-Fi and Cellular Data to force the app into Offline Mode.
4. Press **SOS**. The `MANETModule` will initialize a GATT Server and broadcast the emergency packet to any listening BLE client using UUID `0000180F-0000-1000-8000-00805f9b34fb`.

### 3. The Backend
The mobile app attempts to post live payloads to our live Render instance: `https://roadsos-t1f1.onrender.com/api`. Ensure this endpoint is deployed and active to view live interactions, otherwise the app falls back to its offline mock data layer natively.

---
*Built with React Native, Kotlin, Node.js, and a lot of caffeine.*
