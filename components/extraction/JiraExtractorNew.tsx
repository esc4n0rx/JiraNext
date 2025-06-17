// components/extraction/JiraExtractorNew.tsx
"use client"

import { useState } from 'react'
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
import { Download, CheckCircle, X, Clock, RefreshCw, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { useConfig } from '@/hooks/use-config'
import { useNotifications } from '@/hooks/use-notifications'
import ExtractionAnimation from './ExtractionAnimation'

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

interface ExtractionProgress {
  progress: number
  currentStep: string
  isExtracting: boolean
}

interface ExtractionResult {
  success: boolean
  totalIssues?: number
  downloadUrl?: string
  errorMessage?: string
  fileName?: string
}

export default function JiraExtractorNew() {
  const { refreshDashboard } = useDashboard()
  const { config } = useConfig()
  const { notifyExtractionCompleted, notifyExtractionError } = useNotifications()
  
  const [extractionState, setExtractionState] = useState<ExtractionProgress>({
    progress: 0,
    currentStep: '',
    isExtracting: false
  })
  const [result, setResult] = useState<ExtractionResult | null>(null)

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

  const updateProgress = (progress: number, step: string) => {
    setExtractionState({
      progress: Math.min(100, Math.max(0, progress)),
      currentStep: step,
      isExtracting: true
    })
  }

  const onSubmit = async (data: ExtractionFormData) => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro')
      return
    }

    try {
      setResult(null)
      setExtractionState({ progress: 0, currentStep: 'Iniciando extração...', isExtracting: true })

      const response = await fetch('/api/jira/extract-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: data.startDate,
          endDate: data.endDate,
          configuration: {
            jira_url: config.jiraDomain,
            jira_email: config.jiraEmail,
            jira_token: config.jiraToken
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao extrair dados')
      }

      // Response é um stream, vamos processar os chunks de progresso
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Erro ao processar resposta')
      }

      let finalResult: ExtractionResult | null = null

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                updateProgress(data.progress, data.step)
              } else if (data.type === 'complete') {
                finalResult = {
                  success: true,
                  totalIssues: data.totalIssues,
                  downloadUrl: data.downloadUrl,
                  fileName: data.fileName
                }
              } else if (data.type === 'error') {
                finalResult = {
                  success: false,
                  errorMessage: data.message
                }
              }
            }
          } catch (parseError) {
            console.warn('Erro ao parsear chunk:', parseError)
          }
        }
      }

      setExtractionState({ progress: 100, currentStep: '', isExtracting: false })

      if (finalResult) {
        if (finalResult.success) {
          toast.success(`Extração concluída! ${finalResult.totalIssues} registros processados`)
          
          // Enviar notificação
          if (config.notifications) {
            notifyExtractionCompleted(
              finalResult.totalIssues || 0,
              new Date(data.startDate).toLocaleDateString('pt-BR'),
              new Date(data.endDate).toLocaleDateString('pt-BR')
            )
          }
          
          refreshDashboard()
        } else {
          toast.error(`Erro na extração: ${finalResult.errorMessage}`)
          
          if (config.notifications) {
            notifyExtractionError(finalResult.errorMessage || 'Erro desconhecido')
          }
        }
        
        setResult(finalResult)
      }

    } catch (error) {
      console.error('Erro ao extrair dados:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      toast.error(errorMessage)
      setResult({ success: false, errorMessage })
      setExtractionState({ progress: 0, currentStep: '', isExtracting: false })
      
      if (config.notifications) {
        notifyExtractionError(errorMessage)
      }
    }
  }

  const downloadFile = async () => {
    if (!result?.downloadUrl) return

    try {
      const response = await fetch(result.downloadUrl)
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = result.fileName || 'jira_extraction.xlsx'
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
  const { isExtracting } = extractionState

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

          {!isExtracting && !result && (
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
            </motion.form>
          )}
        </CardContent>
      </Card>

      {/* Animação de extração */}
      <AnimatePresence>
        {isExtracting && (
          <ExtractionAnimation
            progress={extractionState.progress}
            currentStep={extractionState.currentStep}
            isExtracting={isExtracting}
          />
        )}
      </AnimatePresence>

      {/* Resultado */}
      <AnimatePresence>
        {result && !isExtracting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-red-500" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {result.success ? 'Extração Concluída' : 'Erro na Extração'}
                    </h3>
                  </div>
                  <Badge variant={result.success ? "secondary" : "destructive"} className={result.success ? "bg-green-100 text-green-800" : ""}>
                    {result.success ? 'Sucesso' : 'Erro'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {result.success ? (
                  <>
                    <div className="text-center">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        Dados extraídos com sucesso!
                      </p>
                      {result.totalIssues && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.totalIssues} registros processados
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
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      Falha na extração
                    </p>
                    {result.errorMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {result.errorMessage}
                      </p>
                    )}
                  </div>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setExtractionState({ progress: 0, currentStep: '', isExtracting: false })
                  }}
                  className="w-full"
                >
                  Nova Extração
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}