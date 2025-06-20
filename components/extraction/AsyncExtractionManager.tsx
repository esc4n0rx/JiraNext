// components/extraction/AsyncExtractionManager.tsx (versão atualizada com hook de download)
"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Download, CheckCircle, AlertCircle, Clock, RefreshCw, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { JobType } from '@/lib/job-queue'
import { useDownload } from '@/hooks/use-download'
import { useCustomToast } from '@/hooks/use-custom-toast'

interface AsyncExtractionManagerProps {
  jobType: JobType
  jobData: any
  onJobComplete?: (result: any) => void
  onJobError?: (error: string) => void
  autoDownload?: boolean
}

interface JobStatus {
  id: string
  type: JobType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string
  result?: any
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  retryCount: number
}

export default function AsyncExtractionManager({
  jobType,
  jobData,
  onJobComplete,
  onJobError,
  autoDownload = true
}: AsyncExtractionManagerProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [downloadCompleted, setDownloadCompleted] = useState(false)
  const [enableAutoDownload, setEnableAutoDownload] = useState(autoDownload)
  
  const { downloadFile, downloadState, resetDownloadState } = useDownload()
  const toast = useCustomToast()

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jira/jobs/status/${jobId}`)
      
      if (!response.ok) {
        throw new Error('Falha ao buscar status do job')
      }

      const status: JobStatus = await response.json()
      setJobStatus(status)

      // Se o job terminou (sucesso ou erro), parar o polling
      if (status.status === 'completed' || status.status === 'failed') {
        setIsPolling(false)
        
        if (status.status === 'completed') {
          toast.success(`🎉 Extração de ${jobType} concluída!`, {
            title: 'Processamento Finalizado',
            description: `${status.result?.totalIssues || 0} registros processados com sucesso`,
            duration: 6000
          })

          
          // Download automático se habilitado
          if (enableAutoDownload && status.result?.downloadUrl && status.result?.fileName) {
            setTimeout(async () => {
              const downloadSuccess = await downloadFile(
                status.result.downloadUrl, 
                status.result.fileName,
                {
                  showToast: false,
                  showNotification: true,
                  onProgress: (progress) => {
                    console.log(`Download progress: ${progress}%`)
                  }
                }
              )
              
              if (downloadSuccess) {
                setDownloadCompleted(true)
                toast.success('📥 Download automático concluído!')
              }
            }, 1500) // Delay para melhor UX
          }
          
          onJobComplete?.(status.result)
        } else {
          toast.error(`❌ Erro na extração: ${status.errorMessage}`)
          onJobError?.(status.errorMessage || 'Erro desconhecido')
        }
      }

    } catch (error) {
      console.error('Erro ao buscar status:', error)
      toast.error(`❌ Erro na extração: ${error instanceof Error ? error.message : String(error)}`, {
            title: 'Falha no Processamento',
            description: 'Verifique os logs e tente novamente',
            duration: 8000
          })
    onJobError?.(error instanceof Error ? error.message : 'Erro desconhecido')
    }
  }, [jobType, onJobComplete, onJobError, enableAutoDownload, downloadFile])

  // Polling a cada 3 segundos
  useEffect(() => {
    if (!isPolling || !jobStatus?.id) return

    const interval = setInterval(() => {
      pollJobStatus(jobStatus.id)
    }, 3000)

    return () => clearInterval(interval)
  }, [isPolling, jobStatus?.id, pollJobStatus])

  const startExtraction = async () => {
    try {
      resetDownloadState()
      
      // Criar job
      const response = await fetch('/api/jira/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: jobType,
          data: jobData
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao criar job de extração')
      }

      const { jobId } = await response.json()
      
      setJobStatus({
        id: jobId,
        type: jobType,
        status: 'pending',
        progress: 0,
        currentStep: 'Aguardando processamento...',
        createdAt: new Date().toISOString(),
        retryCount: 0
      })

      setIsPolling(true)
      setDownloadCompleted(false)
      
      // Iniciar polling imediatamente
      setTimeout(() => pollJobStatus(jobId), 1000)

      // Disparar processamento
      fetch('/api/jira/jobs/process', { method: 'POST' })
        .catch(error => console.error('Erro ao disparar processamento:', error))

      toast.success('🚀 Extração iniciada!', {
        title: 'Processamento em Andamento',
        description: 'Acompanhe o progresso abaixo. Você será notificado quando terminar.',
        duration: 4000
      })

    } catch (error) {
      console.error('Erro ao iniciar extração:', error)
      toast.error('Falha ao iniciar extração')
    }
  }

  const handleManualDownload = async () => {
    if (!jobStatus?.result?.downloadUrl || !jobStatus?.result?.fileName) return
    
    const success = await downloadFile(
      jobStatus.result.downloadUrl, 
      jobStatus.result.fileName,
      {
        showToast: true,
        showNotification: false,
        onProgress: (progress) => {
          console.log(`Manual download progress: ${progress}%`)
        }
      }
    )

    if (success) {
      setDownloadCompleted(true)
    }
  }

  const getStatusIcon = () => {
    if (!jobStatus) return null

    switch (jobStatus.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (!jobStatus) return 'default'

    switch (jobStatus.status) {
      case 'pending':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-4">
      {!jobStatus && (
        <div className="space-y-4">
          {/* Configuração de Download Automático */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <Label htmlFor="auto-download" className="text-sm font-medium">
                Download automático ao finalizar
              </Label>
            </div>
            <Switch
              id="auto-download"
              checked={enableAutoDownload}
              onCheckedChange={setEnableAutoDownload}
            />
          </div>

          <Button onClick={startExtraction} className="w-full h-11">
            <Download className="mr-2 h-4 w-4" />
            Iniciar Extração
          </Button>
        </div>
      )}

      <AnimatePresence>
        {jobStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    {getStatusIcon()}
                    <span className="ml-2">Extração {jobType}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {downloadCompleted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <FileDown className="h-3 w-3 mr-1" />
                        Baixado
                      </Badge>
                    )}
                    <Badge variant={getStatusColor()} className={jobStatus.status === 'completed' ? "bg-green-100 text-green-800" : ""}>
                      {jobStatus.status === 'pending' && 'Aguardando'}
                      {jobStatus.status === 'processing' && 'Processando'}
                      {jobStatus.status === 'completed' && 'Concluído'}
                      {jobStatus.status === 'failed' && 'Falhou'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar da Extração */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{jobStatus.currentStep}</span>
                    <span className="font-mono">{jobStatus.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={jobStatus.progress} className="h-2" />
                </div>

                {/* Progress Bar do Download */}
                {downloadState.isDownloading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span className="flex items-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Baixando arquivo...
                      </span>
                      <span className="font-mono">{downloadState.progress}%</span>
                    </div>
                    <Progress value={downloadState.progress} className="h-2 bg-blue-100" />
                  </div>
                )}

                {/* Status Details */}
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Iniciado: {new Date(jobStatus.createdAt).toLocaleString('pt-BR')}</div>
                  {jobStatus.startedAt && (
                    <div>Processamento: {new Date(jobStatus.startedAt).toLocaleString('pt-BR')}</div>
                  )}
                  {jobStatus.completedAt && (
                    <div>Concluído: {new Date(jobStatus.completedAt).toLocaleString('pt-BR')}</div>
                  )}
                  {jobStatus.retryCount > 0 && (
                    <div>Tentativas: {jobStatus.retryCount}</div>
                  )}
                </div>

                {/* Result Actions */}
                {jobStatus.status === 'completed' && jobStatus.result && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium text-green-800 dark:text-green-200 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Extração concluída com sucesso!
                        </div>
                        <div className="text-green-600 dark:text-green-400 mt-1">
                          {jobStatus.result.totalIssues} issues processadas
                        </div>
                        {jobStatus.result.processedRecords && (
                          <div className="text-green-600 dark:text-green-400">
                            {jobStatus.result.processedRecords} registros gerados
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status do Download Automático */}
                    {enableAutoDownload && !downloadCompleted && !downloadState.isDownloading && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        🔄 Download automático será iniciado em breve...
                      </div>
                    )}
                    
                    {/* Botão de Download Manual */}
                    <Button 
                      onClick={handleManualDownload}
                      disabled={downloadState.isDownloading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {downloadState.isDownloading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Baixando... {downloadState.progress}%
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          {downloadCompleted ? 'Baixar Novamente' : 'Baixar Planilha Excel'}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Error Details */}
                {jobStatus.status === 'failed' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                        Erro na extração
                      </div>
                      <div className="text-red-600 dark:text-red-400">
                        {jobStatus.errorMessage || 'Erro desconhecido'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Download Error */}
                {downloadState.error && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                        Erro no download
                      </div>
                      <div className="text-orange-600 dark:text-orange-400">
                        {downloadState.error}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {(jobStatus.status === 'failed' || jobStatus.status === 'completed') && (
                  <Button
                    onClick={() => {
                    setJobStatus(null)
                     setIsPolling(false)
                     setDownloadCompleted(false)
                     resetDownloadState()
                   }}
                   variant="outline"
                   className="w-full"
                 >
                   {jobStatus.status === 'failed' ? 'Nova Tentativa' : 'Nova Extração'}
                 </Button>
               )}
             </CardContent>
           </Card>
         </motion.div>
       )}
     </AnimatePresence>
   </div>
 )
}