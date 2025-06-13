// components/extraction/JiraExtractorNew.tsx
"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ExtractionAnimation from './ExtractionAnimation'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { useConfig } from '@/hooks/use-config'

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

const extractionSteps = [
  "Conectando com o Jira...",
  "Validando credenciais...",
  "Construindo consulta JQL...",
  "Buscando chamados (página 1)...",
  "Processando materiais...",
  "Organizando categorias...",
  "Calculando divergências...",
  "Salvando no banco de dados...",
  "Gerando planilha Excel...",
  "Finalizando extração..."
]

export default function JiraExtractorNew() {
  const { refreshDashboard } = useDashboard()
  const { config } = useConfig()
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

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

  const simulateProgress = async () => {
    for (let i = 0; i < extractionSteps.length; i++) {
      setCurrentStepIndex(i)
      
      let stepDuration = 600
      if (i === 3) stepDuration = 1200 // Busca de dados demora mais
      if (i === 7) stepDuration = 800 // Salvar no banco demora um pouco mais
      
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      setProgress(((i + 1) / extractionSteps.length) * 85)
    }
  }

  const onSubmit = async (data: ExtractionFormData) => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro (domínio, email e token)')
      return
    }

    setExtracting(true)
    setProgress(0)
    setCurrentStepIndex(0)

    try {
      const progressPromise = simulateProgress()

      const configuration = {
        jira_url: config.jiraDomain,
        jira_email: config.jiraEmail,
        jira_token: config.jiraToken,
        max_results: 100
      }

      const extractionPromise = fetch('/api/jira/extract', {
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

      const [, response] = await Promise.all([progressPromise, extractionPromise])

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na extração')
      }

      setProgress(100)
      await new Promise(resolve => setTimeout(resolve, 500))

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `base_jira_ajustada_${data.startDate}_${data.endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Extração concluída e dados salvos com sucesso!')
      
      setTimeout(() => {
        refreshDashboard()
      }, 1000)

    } catch (error) {
      console.error('Erro na extração:', error)
      toast.error(error instanceof Error ? error.message : 'Erro durante a extração')
    } finally {
      setExtracting(false)
      setProgress(0)
      setCurrentStepIndex(0)
    }
  }

  const hasValidConfig = config.jiraDomain && config.jiraToken && config.jiraEmail

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Extrair Dados do Jira
            </CardTitle>
            {hasValidConfig && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Conectado a: {config.jiraDomain}
              </p>
            )}
          </motion.div>
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

          {extracting ? (
            <ExtractionAnimation 
              progress={progress}
              currentStep={extractionSteps[currentStepIndex]}
              isExtracting={extracting}
            />
          ) : (
            <motion.form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
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
                    { label: 'Últimos 90 dias', days: 90 }
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

              <motion.div
                whileHover={{ scale: hasValidConfig ? 1.02 : 1 }}
                whileTap={{ scale: hasValidConfig ? 0.98 : 1 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                  disabled={extracting || !hasValidConfig}
                >
                  <Download className="mr-2 h-5 w-5" />
                  {hasValidConfig ? 'Iniciar Extração' : 'Configure o Jira Primeiro'}
                </Button>
              </motion.div>

              {hasValidConfig && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-500 dark:text-gray-400 text-center"
                >
                  Os dados extraídos serão salvos automaticamente no banco de dados para relatórios futuros
                </motion.div>
              )}
            </motion.form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}