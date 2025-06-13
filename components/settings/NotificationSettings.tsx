// components/settings/NotificationSettings.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/use-notifications'
import { useConfig } from '@/hooks/use-config'
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react'

export default function NotificationSettings() {
  const { 
    permission, 
    isSupported, 
    requestPermission, 
    isRequesting,
    showNotification 
  } = useNotifications()
  
  const { config, saveConfig } = useConfig()

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const result = await requestPermission()
      if (result === 'granted') {
        await saveConfig({ ...config, notifications: true })
      }
    } else {
      await saveConfig({ ...config, notifications: enabled })
    }
  }

  const testNotification = () => {
    showNotification('Teste de Notificação', {
      body: 'Esta é uma notificação de teste do Jira Analytics Pro!',
      icon: '/favicon.ico'
    })
  }

  const getPermissionStatus = () => {
    if (!isSupported) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <XCircle className="h-3 w-3" />
          <span>Não Suportado</span>
        </Badge>
      )
    }

    switch (permission) {
      case 'granted':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Permitido</span>
          </Badge>
        )
      case 'denied':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span>Negado</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <Bell className="h-3 w-3" />
            <span>Não Solicitado</span>
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Configurações de Notificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status das permissões */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium">Status das Notificações</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Permissão atual do navegador
            </p>
          </div>
          {getPermissionStatus()}
        </div>

        {/* Toggle principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificações de Extração</Label>
            <p className="text-sm text-gray-500">
              Receber notificações quando extrações terminarem
            </p>
          </div>
          <Switch
            checked={config.notifications && permission === 'granted'}
            onCheckedChange={handleToggleNotifications}
            disabled={!isSupported}
          />
        </div>

        {/* Botões de ação */}
        <div className="space-y-3">
          {permission !== 'granted' && isSupported && (
            <Button
              onClick={requestPermission}
              disabled={isRequesting}
              className="w-full"
              variant="outline"
            >
              <Bell className="h-4 w-4 mr-2" />
              {isRequesting ? 'Solicitando Permissão...' : 'Solicitar Permissão'}
            </Button>
          )}

          {permission === 'granted' && (
            <Button
              onClick={testNotification}
              variant="outline"
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Testar Notificação
            </Button>
          )}

          {permission === 'denied' && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Permissão negada:</strong> Para habilitar notificações, 
                clique no ícone de cadeado na barra de endereços e permita notificações, 
                depois recarregue a página.
              </p>
            </div>
          )}

          {!isSupported && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Não suportado:</strong> Seu navegador não suporta notificações push. 
                Considere usar um navegador mais recente.
              </p>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Sobre as Notificações
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Você será notificado quando extrações terminarem</li>
            <li>• Funciona mesmo com a página fechada</li>
            <li>• Clique na notificação para voltar ao app</li>
            <li>• Pode ser desabilitado a qualquer momento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}