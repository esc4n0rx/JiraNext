// public/sw.js
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'default',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Visualizar'
        },
        {
          action: 'dismiss',
          title: 'Dispensar'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})