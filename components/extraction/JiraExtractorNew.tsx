// components/extraction/JiraExtractorNew.tsx
"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Download, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { useConfig } from '@/hooks/use-config'
import { useNotifications } from '@/hooks/use-notifications'

const extractionSchema = z.object({
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória')
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: "Data de início deve ser anterior à data de fim",
    path: ["endDate"],
  }
)

type ExtractionFormData = z.infer<typeof extractionSchema>

interface ExtractionStatus {
  id: string
  status: 'processing' | 'completed' | 'error'
  progress: number
  currentStep: string
  totalIssues?: number
  errorMessage?: string
  filePath?: string
}

export default function JiraExtractorNew() {
  const { refreshDashboard } = useDashboard()
  const { config } = useConfig()
  const [currentExtraction, setCurrentExtraction] = useState<ExtractionStatus | null>(null)
  const { notifyExtractionCompleted, notifyExtractionError } = useNotifications()
  const [isPolling, setIsPolling] = useState(false)

  // Calcular datas padrão (últimos 30 dias)
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const form = useForm<ExtractionFormData>({
    resolver: zodResolver(extractionSchema),
    defaultValues: {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  })

  // Polling para acompanhar progresso com verificações de segurança
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (currentExtraction && currentExtraction.status === 'processing' && isPolling) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/jira/status/${currentExtraction.id}`)
          
          if (!response.ok) {
            console.error(`Erro HTTP ${response.status}`)
            return
          }

          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Resposta não é JSON válido')
            return
          }

          const status = await response.json()
          setCurrentExtraction(status)

          if (status.status === 'completed') {
            toast.success(`Extração concluída! ${status.totalIssues || 0} registros processados`)
            
            // Enviar notificação push
            if (config.notifications) {
              notifyExtractionCompleted(
                status.totalIssues || 0,
                new Date(status.startDate).toLocaleDateString('pt-BR'),
                new Date(status.endDate).toLocaleDateString('pt-BR')
              )
            }
            
            setIsPolling(false)
            refreshDashboard()
          } else if (status.status === 'error') {
            toast.error(`Erro na extração: ${status.errorMessage || 'Erro desconhecido'}`)
            
            // Enviar notificação de erro
            if (config.notifications) {
              notifyExtractionError(status.errorMessage || 'Erro desconhecido')
            }
            
            setIsPolling(false)
          }
        } catch (error) {
          console.error('Erro ao buscar status:', error)
          // Não quebrar o polling por um erro pontual
        }
      }, 3000) // Aumentar intervalo para 3 segundos
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentExtraction, isPolling, refreshDashboard, config.notifications, notifyExtractionCompleted, notifyExtractionError])

  const onSubmit = async (data: ExtractionFormData) => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro')
      return
    }

    try {
      const configuration = {
        jira_url: config.jiraDomain,
        jira_email: config.jiraEmail,
        jira_token: config.jiraToken,
        max_results: 100
      }

      const response = await fetch('/api/jira/extract-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: data.startDate,
          endDate: data.endDate,
          configuration
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao iniciar extração')
      }

      const result = await response.json()
      
      setCurrentExtraction({
        id: result.extractionId,
        status: 'processing',
        progress: 0,
        currentStep: 'Iniciando extração...'
      })
      
      setIsPolling(true)
      toast.success('Extração iniciada! Acompanhe o progresso abaixo.')

    } catch (error) {
      console.error('Erro ao iniciar extração:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar extração')
    }
  }

  const downloadFile = async () => {
    if (!currentExtraction || currentExtraction.status !== 'completed') return

    try {
      const response = await fetch(`/api/jira/download-extraction/${currentExtraction.id}`)
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `base_jira_ajustada_${currentExtraction.id}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Arquivo baixado com sucesso!')
    } catch (error) {
      toast.error('Erro ao baixar arquivo')
    }
  }

  const hasValidConfig = config.jiraDomain && config.jiraToken && config.jiraEmail
  const isExtracting = currentExtraction?.status === 'processing'

  const getStatusIcon = () => {
    if (!currentExtraction) return null
    
    switch (currentExtraction.status) {
      case 'processing':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    if (!currentExtraction) return null
    
    switch (currentExtraction.status) {
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processando</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Concluído</Badge>
      case 'error':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Card principal */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Extrair Dados do Jira
          </CardTitle>
          {hasValidConfig && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Conectado a: {config.jiraDomain}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!hasValidConfig && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
            >
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ Configure suas credenciais do Jira na aba "Configurações" antes de extrair dados.
              </p>
            </motion.div>
          )}

          {!isExtracting && (
            <motion.form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Data de Início
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register('startDate')}
                    className="w-full text-base"
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    Data de Fim
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...form.register('endDate')}
                    className="w-full text-base"
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Botões de período rápido */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Períodos rápidos:</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Últimos 7 dias', days: 7 },
                    { label: 'Últimos 15 dias', days: 15 },
                    { label: 'Últimos 30 dias', days: 30 },
                    { label: 'Últimos 60 dias', days: 60 },
                  ].map(({ label, days }) => (
                    <Button
                      key={days}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const end = new Date()
                        const start = new Date()
                        start.setDate(end.getDate() - days)
                        
                        form.setValue('startDate', start.toISOString().split('T')[0])
                        form.setValue('endDate', end.toISOString().split('T')[0])
                      }}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={!hasValidConfig}
              >
                <Download className="mr-2 h-5 w-5" />
                {hasValidConfig ? 'Iniciar Extração' : 'Configure o Jira Primeiro'}
              </Button>

              {hasValidConfig && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  A extração será processada em background. Você pode fechar esta página e voltar depois.
                </div>
              )}
            </motion.form>
          )}
        </CardContent>
      </Card>

      {/* Card de progresso */}
      <AnimatePresence>
        {currentExtraction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon()}
                    <h3 className="text-lg font-semibold">Status da Extração</h3>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {currentExtraction.status === 'processing' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{currentExtraction.currentStep}</span>
                        <span className="font-mono">{currentExtraction.progress}%</span>
                      </div>
                      <Progress value={currentExtraction.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 mr-2" />
                      Processamento em andamento...
                    </div>
                  </>
                )}
                
                {currentExtraction.status === 'completed' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        Extração concluída com sucesso!
                      </p>
                      {currentExtraction.totalIssues && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {currentExtraction.totalIssues} registros processados
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={downloadFile}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Planilha Excel
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentExtraction(null)}
                      className="w-full"
                    >
                      Nova Extração
                    </Button>
                  </div>
                )}
                
                {currentExtraction.status === 'error' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Erro durante a extração
                      </p>
                      {currentExtraction.errorMessage && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {currentExtraction.errorMessage}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentExtraction(null)}
                      className="w-full"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}