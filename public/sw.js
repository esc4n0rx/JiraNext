// public/sw.js
const CACHE_NAME = 'jira-analytics-v1'
const urlsToCache = [
  '/',
  '/favicon.ico'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  // Handle different actions
  if (event.action === 'download') {
    // Open download URL if available
    const downloadUrl = event.notification.data?.downloadUrl
    if (downloadUrl) {
      event.waitUntil(
        clients.openWindow(downloadUrl)
      )
    }
  } else if (event.action === 'view' || !event.action) {
    // Open main app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
    )
  } else if (event.action === 'retry') {
    // Navigate to extraction page
    event.waitUntil(
      clients.openWindow('/?tab=extract')
    )
  }
})

// Push event (for future use)
self.addEventListener('push', (event) => {
  console.log('Push received:', event)
  
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event)
  
  if (event.tag === 'background-download') {
    event.waitUntil(
      // Handle background download logic
      console.log('Handling background download')
    )
  }
})

// Message event
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})