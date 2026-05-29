package com.roadsos.manet.ble

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.os.ParcelUuid
import com.roadsos.manet.crypto.SOSPacket
import java.util.UUID

@SuppressLint("MissingPermission")
class BLEGattServer(private val context: Context) {

    companion object {
        val SOS_SERVICE_UUID: UUID = UUID.fromString("0000abcd-0000-1000-8000-00805f9b34fb")
        val SOS_CHARACTERISTIC_UUID: UUID = UUID.fromString("0000dcba-0000-1000-8000-00805f9b34fb")
    }

    private var gattServer: BluetoothGattServer? = null
    private var currentPacketJson: String = ""
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager

    // Starts GATT server and advertises ROADSoS UUID so nearby devices can discover it
    fun start(packet: SOSPacket) {
        currentPacketJson = packet.toJson()
        startGattServer()
        startAdvertising()
    }

    fun stop() {
        gattServer?.close()
        bluetoothManager.adapter.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
    }

    private fun startGattServer() {
        val characteristic = BluetoothGattCharacteristic(
            SOS_CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        val service = BluetoothGattService(
            SOS_SERVICE_UUID,
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        ).apply { addCharacteristic(characteristic) }

        gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
            ?.apply { addService(service) }
    }

    private fun startAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build()

        val data = AdvertiseData.Builder()
            .addServiceUuid(ParcelUuid(SOS_SERVICE_UUID))
            .setIncludeDeviceName(false)
            .build()

        bluetoothManager.adapter.bluetoothLeAdvertiser
            ?.startAdvertising(settings, data, advertiseCallback)
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onCharacteristicReadRequest(
            device: BluetoothDevice, requestId: Int, offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            if (characteristic.uuid == SOS_CHARACTERISTIC_UUID) {
                gattServer?.sendResponse(
                    device, requestId, BluetoothGatt.GATT_SUCCESS,
                    offset, currentPacketJson.toByteArray(Charsets.UTF_8)
                )
            }
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {}
        override fun onStartFailure(errorCode: Int) {}
    }
}