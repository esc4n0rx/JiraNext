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
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { useConfig } from '@/hooks/use-config'
import { useNotifications } from '@/hooks/use-notifications'
import AsyncExtractionManager from './AsyncExtractionManager'
import { useCustomToast } from '@/hooks/use-custom-toast'

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

export default function JiraExtractorNew() {
  const { refreshDashboard } = useDashboard()
  const { config } = useConfig()
  const { notifyExtractionCompleted, notifyExtractionError } = useNotifications()
  
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionData, setExtractionData] = useState<any>(null)

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

  const onSubmit = async (data: ExtractionFormData) => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro', {
        description: 'Acesse a aba Configurações para inserir suas credenciais'
      })
      return
    }

    setIsExtracting(true)
    setExtractionData({
      startDate: data.startDate,
      endDate: data.endDate,
      configuration: {
        jira_url: config.jiraDomain,
        jira_email: config.jiraEmail,
        jira_token: config.jiraToken
      }
    })
  }

  const handleJobComplete = (result: any) => {
    setIsExtracting(false)
    
    // Notificação com informações do download
    if (config.notifications) {
      notifyExtractionCompleted(
        result.totalIssues || 0,
        new Date(extractionData.startDate).toLocaleDateString('pt-BR'),
        new Date(extractionData.endDate).toLocaleDateString('pt-BR')
      )
    }
    
    // Refresh do dashboard
    refreshDashboard()
    
    // Toast adicional com informações do resultado
    toast.success(
      `🎉 Extração finalizada! ${result.totalIssues} issues processadas. ${result.processedRecords || 0} registros gerados.`,
      {
        duration: 5000,
        action: {
          label: 'Ver Dashboard',
          onClick: () => {
            // Poderia navegar para a aba dashboard
            console.log('Navegando para dashboard...')
          }
        }
      }
    )
  }

  const handleJobError = (error: string) => {
    setIsExtracting(false)
    
    if (config.notifications) {
      notifyExtractionError(error)
    }
    
    // Toast de erro mais detalhado
    toast.error(
      `❌ Falha na extração: ${error}`,
      {
        duration: 8000,
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            setIsExtracting(false)
            setExtractionData(null)
          }
        }
      }
    )
  }

  const hasValidConfig = config.jiraDomain && config.jiraToken && config.jiraEmail

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
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
            </motion.form>
          )}

          {/* Gerenciador de Extração Assíncrona com Download Automático */}
          {isExtracting && extractionData && (
            <AsyncExtractionManager
              jobType="divergencias"
              jobData={extractionData}
              onJobComplete={handleJobComplete}
              onJobError={handleJobError}
              autoDownload={true} // Habilitar download automático
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}