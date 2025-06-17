// hooks/use-notifications.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export type NotificationPermission = 'default' | 'granted' | 'denied'

interface NotificationState {
  permission: NotificationPermission
  isSupported: boolean
  isRequesting: boolean
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false,
    isRequesting: false
  })

  // Verificar suporte e permissão inicial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator
      const permission = isSupported ? Notification.permission as NotificationPermission : 'denied'
      
      setState({
        isSupported,
        permission,
        isRequesting: false
      })

      // Registrar Service Worker automaticamente se suportado
      if (isSupported && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registrado com sucesso:', registration.scope)
          })
          .catch(error => {
            console.error('Falha ao registrar Service Worker:', error)
          })
      }
    }
  }, [])

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      toast.error('Seu navegador não suporta notificações')
      return 'denied'
    }

    if (state.permission === 'granted') {
      toast.success('Notificações já estão habilitadas')
      return 'granted'
    }

    setState(prev => ({ ...prev, isRequesting: true }))

    try {
      // Garantir que o Service Worker está registrado
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('Service Worker registrado:', registration.scope)
          
          // Aguardar o service worker estar pronto
          await navigator.serviceWorker.ready
        } catch (swError) {
          console.warn('Erro no Service Worker:', swError)
        }
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission()
      
      setState(prev => ({
        ...prev,
        permission: permission as NotificationPermission,
        isRequesting: false
      }))

      if (permission === 'granted') {
        toast.success('Notificações habilitadas com sucesso!')
        
        // Testar notificação imediatamente
        setTimeout(() => {
          showNotification('Notificações Habilitadas! 🎉', {
            body: 'Você será notificado quando as extrações terminarem!',
            icon: '/favicon.ico',
            tag: 'test-notification',
            requireInteraction: false
          })
        }, 500)
      } else if (permission === 'denied') {
        toast.error('Permissão para notificações negada')
      }

      return permission as NotificationPermission
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error)
      setState(prev => ({ ...prev, isRequesting: false }))
      toast.error('Erro ao solicitar permissão para notificações')
      return 'denied'
    }
  }, [state.isSupported, state.permission])

  // Mostrar notificação
  const showNotification = useCallback((
    title: string,
    options?: NotificationOptions
  ): Notification | null => {
    console.log('Tentando mostrar notificação:', title, options)
    console.log('Estado atual:', { 
      isSupported: state.isSupported, 
      permission: state.permission 
    })

    if (!state.isSupported) {
      console.warn('Notificações não suportadas')
      toast.error('Notificações não suportadas neste navegador')
      return null
    }

    if (state.permission !== 'granted') {
      console.warn('Permissão não concedida:', state.permission)
      toast.error('Permissão para notificações não concedida')
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        ...options
      })

      console.log('Notificação criada:', notification)

      // Configurar eventos da notificação
      notification.onclick = (event) => {
        console.log('Notificação clicada')
        event.preventDefault()
        
        // Focar na janela se estiver aberta
        if (window) {
          window.focus()
        }
        
        notification.close()
        
        // Se tiver URL personalizada nos options, navegar
        if (options?.data?.url) {
          window.open(options.data.url, '_blank')
        }
      }

      notification.onerror = (error) => {
        console.error('Erro na notificação:', error)
        toast.error('Erro ao exibir notificação')
      }

      notification.onshow = () => {
        console.log('Notificação mostrada com sucesso')
      }

      notification.onclose = () => {
        console.log('Notificação fechada')
      }

      // Auto-fechar após 8 segundos se não for requireInteraction
      if (!options?.requireInteraction) {
        setTimeout(() => {
          if (notification) {
            notification.close()
          }
        }, 8000)
      }

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      toast.error(`Erro ao exibir notificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return null
    }
  }, [state.isSupported, state.permission])

  // Notificação específica para extração concluída
  const notifyExtractionCompleted = useCallback((
    totalIssues: number,
    startDate: string,
    endDate: string
  ) => {
    console.log('Enviando notificação de extração concluída')
    return showNotification('Extração do Jira Concluída! 🎉', {
      body: `${totalIssues} registros extraídos (${startDate} - ${endDate})\nClique para ver os resultados`,
      icon: '/favicon.ico',
      tag: 'extraction-completed',
      requireInteraction: true,
      data: { url: window.location.origin }
    })
  }, [showNotification])

  // Notificação para erro na extração
  const notifyExtractionError = useCallback((errorMessage: string) => {
    console.log('Enviando notificação de erro na extração')
    return showNotification('Erro na Extração ❌', {
      body: `Falha durante o processamento: ${errorMessage}\nClique para tentar novamente`,
      icon: '/favicon.ico',
      tag: 'extraction-error',
      requireInteraction: true,
      data: { url: window.location.origin }
    })
  }, [showNotification])

  return {
    ...state,
    requestPermission,
    showNotification,
    notifyExtractionCompleted,
    notifyExtractionError
  }
}