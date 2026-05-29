package com.roadsos.manet.relay

import android.util.LruCache

object NonceCache {

    private const val MAX_SIZE = 500
    private const val TTL_MS = 60_000L

    private val cache = LruCache<String, Long>(MAX_SIZE)

    // Returns true if nonce was seen within the last 60 seconds
    fun isSeen(nonce: String): Boolean {
        val ts = cache.get(nonce) ?: return false
        return System.currentTimeMillis() - ts < TTL_MS
    }

    fun markSeen(nonce: String) {
        cache.put(nonce, System.currentTimeMillis())
    }
}