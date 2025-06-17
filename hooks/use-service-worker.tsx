// hooks/use-service-worker.tsx
"use client"

import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration.scope)
          
          // Verificar se há atualizações
          registration.addEventListener('updatefound', () => {
            console.log('Nova versão do Service Worker encontrada')
          })
        })
        .catch(error => {
          console.error('Erro ao registrar Service Worker:', error)
        })

      // Escutar mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Mensagem do Service Worker:', event.data)
      })
    } else {
      console.warn('Service Worker ou Push API não suportados')
    }
  }, [])
}