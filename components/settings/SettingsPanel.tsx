// components/settings/SettingsPanel.tsx
"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NotificationSettings from './NotificationSettings'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from 'next-themes'
import { useConfig } from '@/hooks/use-config'
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Database, 
  Eye, 
  EyeOff,
  Save,
  TestTube,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPanel() {
  const { theme, setTheme } = useTheme()
  const { config, loading, saveConfig } = useConfig()
  const [showToken, setShowToken] = useState(false)
  const [formData, setFormData] = useState(config)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setFormData(config)
  }, [config])

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(config)
    setHasChanges(changed)
  }, [formData, config])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(formData)
      setHasChanges(false)
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!formData.jiraDomain || !formData.jiraToken || !formData.jiraEmail) {
      toast.error('Preencha todos os campos primeiro')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: formData.jiraDomain,
          email: formData.jiraEmail,
          token: formData.jiraToken
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Conexão testada com sucesso! Logado como: ${data.user.displayName}`)
      } else {
        toast.error(data.error || 'Falha na conexão com o Jira')
      }
    } catch (error) {
      toast.error('Erro ao testar conexão')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="border-0 shadow-xl">
          <CardContent className="flex items-center justify-center p-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando configurações...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="h-6 w-6 mr-3" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jira" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="jira" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Jira API
              </TabsTrigger>
              <TabsTrigger value="interface" className="flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Interface
              </TabsTrigger>
               <TabsTrigger value="notifications" className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notificações
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Avançado
            </TabsTrigger>
            </TabsList>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="jira" className="space-y-6 mt-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jiraDomain">Domínio do Jira</Label>
                    <Input
                      id="jiraDomain"
                      placeholder="https://sua-empresa.atlassian.net"
                      value={formData.jiraDomain}
                      onChange={(e) => setFormData({...formData, jiraDomain: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jiraEmail">Email do Jira</Label>
                    <Input
                      id="jiraEmail"
                      type="email"
                      placeholder="seu-email@empresa.com"
                      value={formData.jiraEmail}
                      onChange={(e) => setFormData({...formData, jiraEmail: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jiraToken">Token da API</Label>
                    <div className="relative">
                      <Input
                        id="jiraToken"
                        type={showToken ? 'text' : 'password'}
                        placeholder="Seu token de API do Jira"
                        value={formData.jiraToken}
                        onChange={(e) => setFormData({...formData, jiraToken: e.target.value})}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Para gerar um token, acesse: Jira → Configurações → Segurança → Tokens de API
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jiraApiPath">Caminho da API</Label>
                    <Input
                      id="jiraApiPath"
                      placeholder="/rest/api/3/search"
                      value={formData.jiraApiPath}
                      onChange={(e) => setFormData({...formData, jiraApiPath: e.target.value})}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={testing}
                      className="flex items-center"
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      {testing ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6 mt-6">
                <NotificationSettings />
                </TabsContent>

              <TabsContent value="interface" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tema da Interface</Label>
                      <p className="text-sm text-gray-500">Escolha entre tema claro ou escuro</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('light')}
                      >
                        Claro
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('dark')}
                      >
                        Escuro
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('system')}
                      >
                        Sistema
                      </Button>
                    </div>
                  </div>

                  {/* Download Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configurações de Download</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Download Automático</Label>
                        <p className="text-sm text-gray-500">Baixar automaticamente quando extrações terminarem</p>
                      </div>
                      <Switch
                        checked={formData.autoDownload ?? true}
                        onCheckedChange={(checked) => 
                          setFormData({...formData, autoDownload: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Mostrar Progresso de Download</Label>
                        <p className="text-sm text-gray-500">Exibir barra de progresso durante downloads</p>
                      </div>
                      <Switch
                        checked={formData.showDownloadProgress ?? true}
                        onCheckedChange={(checked) => 
                          setFormData({...formData, showDownloadProgress: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificar Download Concluído</Label>
                        <p className="text-sm text-gray-500">Enviar notificação quando download terminar</p>
                      </div>
                      <Switch
                        checked={formData.notifyDownloadComplete ?? false}
                        onCheckedChange={(checked) => 
                          setFormData({...formData, notifyDownloadComplete: checked})
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Demonstração</Label>
                      <p className="text-sm text-gray-500">Usar dados fictícios para teste</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.useMockData}
                        onCheckedChange={(checked) => 
                          setFormData({...formData, useMockData: checked})
                        }
                      />
                      {formData.useMockData && (
                        <Badge variant="secondary">Demo</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações do Sistema</Label>
                      <p className="text-sm text-gray-500">Receber notificações sobre extrações</p>
                    </div>
                    <Switch
                      checked={formData.notifications}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, notifications: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações Push</Label>
                      <p className="text-sm text-gray-500">Notificações do navegador</p>
                    </div>
                    <Switch
                      checked={formData.notifications}
                      onCheckedChange={(checked) => {
                        if (checked && 'Notification' in window) {
                          Notification.requestPermission()
                        }
                        setFormData({...formData, notifications: checked})
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </motion.div>

            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mt-6 pt-6 border-t"
              >
                <Button onClick={handleSave} disabled={saving} className="flex items-center">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </motion.div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}