// hooks/use-service-worker.tsx
"use client"

import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado:', registration)
        })
        .catch(error => {
          console.error('Erro ao registrar Service Worker:', error)
        })
    }
  }, [])
}