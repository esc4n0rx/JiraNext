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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission as NotificationPermission
      }))
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
      const permission = await Notification.requestPermission()
      
      setState(prev => ({
        ...prev,
        permission: permission as NotificationPermission,
        isRequesting: false
      }))

      if (permission === 'granted') {
        toast.success('Notificações habilitadas com sucesso!')
        // Enviar notificação de teste
        showNotification('Notificações Habilitadas', {
          body: 'Você será notificado quando as extrações terminarem!',
          icon: '/favicon.ico'
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
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })

      // Auto-fechar após 5 segundos
      setTimeout(() => {
        notification.close()
      }, 5000)

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
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
      body: `${totalIssues} registros extraídos (${startDate} - ${endDate})`,
      icon: '/favicon.ico',
      tag: 'extraction-completed',
      requireInteraction: true
    })
  }, [showNotification])

  // Notificação para erro na extração
  const notifyExtractionError = useCallback((errorMessage: string) => {
    return showNotification('Erro na Extração ❌', {
      body: `Falha durante o processamento: ${errorMessage}`,
      icon: '/favicon.ico',
      tag: 'extraction-error',
      requireInteraction: true
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