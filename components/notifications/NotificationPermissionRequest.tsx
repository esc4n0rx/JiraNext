// components/notifications/NotificationPermissionRequest.tsx
"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'
import { Bell, BellOff, X } from 'lucide-react'

export default function NotificationPermissionRequest() {
  const { permission, isSupported, requestPermission, isRequesting } = useNotifications()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showRequest, setShowRequest] = useState(false)

  useEffect(() => {
    // Verificar se já foi dismissado nesta sessão
    const dismissed = sessionStorage.getItem('notification-permission-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Mostrar request apenas se suportado e não concedido
    if (isSupported && permission === 'default') {
      // Delay para não aparecer imediatamente
      setTimeout(() => setShowRequest(true), 2000)
    }
  }, [isSupported, permission])

  const handleDismiss = () => {
    setIsDismissed(true)
    setShowRequest(false)
    sessionStorage.setItem('notification-permission-dismissed', 'true')
  }

  const handleAllow = async () => {
    const result = await requestPermission()
    if (result === 'granted' || result === 'denied') {
      setShowRequest(false)
    }
  }

  if (!isSupported || permission !== 'default' || isDismissed || !showRequest) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Receber Notificações
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Seja notificado quando suas extrações do Jira terminarem, mesmo com a página fechada.
                </p>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAllow}
                    disabled={isRequesting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    {isRequesting ? 'Solicitando...' : 'Permitir'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDismiss}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <BellOff className="h-4 w-4 mr-1" />
                    Agora não
                  </Button>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}