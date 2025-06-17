// public/sw.js
const CACHE_NAME = 'jira-analytics-v1'

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker ativado')
  event.waitUntil(self.clients.claim())
})

// Push event (para notificações push futuras)
self.addEventListener('push', event => {
  console.log('Push event recebido:', event)
  
  const options = {
    body: 'Extração do Jira concluída!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'jira-extraction'
  }

  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.tag = data.tag || options.tag
  }

  event.waitUntil(
    self.registration.showNotification('Jira Analytics Pro', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notificação clicada:', event)
  event.notification.close()

  event.waitUntil(
    clients.openWindow('/')
  )
})