// components/JiraHistory.tsx
"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JiraExtraction } from '@/types/jira'
import { Download, Calendar, Clock, FileText, Loader2, History } from 'lucide-react'
import { toast } from 'sonner'

export default function JiraHistory() {
  const { user } = useAuth()
  const [extractions, setExtractions] = useState<JiraExtraction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/jira/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico')
      }

      const data = await response.json()
      setExtractions(data)
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (extractionId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/jira/download/${extractionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      toast.error('Erro ao baixar arquivo')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    const labels = {
      processing: 'Processando',
      completed: 'Concluído',
      error: 'Erro'
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.error}>
        {labels[status as keyof typeof labels] || 'Desconhecido'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="h-5 w-5 mr-2" />
          Histórico de Extrações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {extractions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma extração encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {extractions.map((extraction) => (
              <div
                key={extraction.id}
                className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">
                      {new Date(extraction.start_date).toLocaleDateString('pt-BR')} - {' '}
                      {new Date(extraction.end_date).toLocaleDateString('pt-BR')}
                    </span>
                    {getStatusBadge(extraction.status)}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Criado: {formatDate(extraction.created_at)}</span>
                    </div>
                    
                    {extraction.total_issues && (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{extraction.total_issues} issues</span>
                      </div>
                    )}
                    
                    {extraction.completed_at && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Concluído: {formatDate(extraction.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {extraction.status === 'completed' && extraction.file_path && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadFile(extraction.id, extraction.file_path!)}
                    className="ml-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}