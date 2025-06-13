// components/extraction/ActiveExtractions.tsx
"use client"

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useExtractions } from '@/hooks/use-extractions'
import { Download, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ActiveExtractions() {
  const { activeExtractions, loading } = useExtractions()

  const downloadFile = async (extractionId: string) => {
    try {
      const response = await fetch(`/api/jira/download-extraction/${extractionId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `base_jira_ajustada_${extractionId}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Arquivo baixado com sucesso!')
    } catch (error) {
      toast.error('Erro ao baixar arquivo')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando extrações...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activeExtractions.length === 0) {
    return null
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Extrações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeExtractions.map((extraction, index) => (
            <motion.div
              key={extraction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(extraction.status)}
                  <div>
                    <p className="font-medium">
                      {format(new Date(extraction.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                      {format(new Date(extraction.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Iniciado em {format(new Date(extraction.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(extraction.status)}
              </div>

              {extraction.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{extraction.currentStep}</span>
                    <span className="font-mono">{extraction.progress}%</span>
                  </div>
                  <Progress value={extraction.progress} className="h-2" />
                </div>
              )}

              {extraction.status === 'completed' && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {extraction.totalIssues} registros processados
                  </div>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(extraction.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                </div>
              )}

              {extraction.status === 'error' && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {extraction.errorMessage || 'Erro durante o processamento'}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}