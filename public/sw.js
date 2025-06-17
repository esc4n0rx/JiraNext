// public/sw.js
const CACHE_NAME = 'jira-analytics-v1'

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event.notification.tag)
  
  event.notification.close()
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se há uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Caso contrário, abrir nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {}
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})