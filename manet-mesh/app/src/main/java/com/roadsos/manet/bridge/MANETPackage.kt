package com.roadsos.manet.bridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MANETPackage : ReactPackage {

    // Registers MANETModule so React Native JS can call NativeModules.MANETModule
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MANETModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}