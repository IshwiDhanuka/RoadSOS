package com.roadsos.manet.ble

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import com.roadsos.manet.crypto.SOSPacket

@SuppressLint("MissingPermission")
class BLEGattClient(
    private val context: Context,
    private val onPacketReceived: (SOSPacket) -> Unit
) {

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private var bluetoothGatt: BluetoothGatt? = null

    // Starts scanning for devices advertising the ROADSoS service UUID
    fun startScanning() {
        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(BLEGattServer.SOS_SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        bluetoothManager.adapter.bluetoothLeScanner
            ?.startScan(listOf(filter), settings, scanCallback)
    }

    fun stopScanning() {
        bluetoothManager.adapter.bluetoothLeScanner?.stopScan(scanCallback)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            stopScanning()
            connectToDevice(result.device)
        }
    }

    // Connects to discovered device and reads SOSPacket characteristic
    private fun connectToDevice(device: BluetoothDevice) {
        bluetoothGatt = device.connectGatt(context, false, gattCallback)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                gatt.discoverServices()
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val characteristic = gatt
                    .getService(BLEGattServer.SOS_SERVICE_UUID)
                    ?.getCharacteristic(BLEGattServer.SOS_CHARACTERISTIC_UUID)
                characteristic?.let { gatt.readCharacteristic(it) }
            }
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val json = characteristic.value.toString(Charsets.UTF_8)
                runCatching { SOSPacket.fromJson(json) }
                    .onSuccess { packet ->
                        onPacketReceived(packet)
                        gatt.disconnect()
                    }
            }
        }
    }
}