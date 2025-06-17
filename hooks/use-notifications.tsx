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
    }
  }, [])

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      toast.error('Seu navegador não suporta notificações')
      return 'denied'
    }

    if (state.permission === 'granted') {
      return 'granted'
    }

    setState(prev => ({ ...prev, isRequesting: true }))

    try {
      // Registrar service worker primeiro se não estiver registrado
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js')
        } catch (swError) {
          console.log('Service worker já registrado ou erro:', swError)
        }
      }

      const permission = await Notification.requestPermission()
      
      setState(prev => ({
        ...prev,
        permission: permission as NotificationPermission,
        isRequesting: false
      }))

      if (permission === 'granted') {
        toast.success('Notificações habilitadas com sucesso!')
        // Enviar notificação de teste
        showNotification('Notificações Habilitadas! 🎉', {
          body: 'Você será notificado quando as extrações terminarem!',
          icon: '/favicon.ico',
          tag: 'test-notification'
        })
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
    if (!state.isSupported || state.permission !== 'granted') {
      console.log('Notificações não suportadas ou não permitidas')
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

      // Configurar eventos da notificação
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        notification.close()
        
        // Se tiver URL personalizada nos options, navegar
        if (options?.data?.url) {
          window.open(options.data.url, '_blank')
        }
      }

      notification.onerror = (error) => {
        console.error('Erro na notificação:', error)
      }

      // Auto-fechar após 10 segundos se não for requireInteraction
      if (!options?.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 10000)
      }

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      toast.error('Erro ao exibir notificação')
      return null
    }
  }, [state.isSupported, state.permission])

  // Notificação específica para extração concluída
  const notifyExtractionCompleted = useCallback((
    totalIssues: number,
    startDate: string,
    endDate: string
  ) => {
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