// components/JiraExtractor.tsx
"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useJiraConfig } from '@/contexts/JiraConfigContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Download, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const extractionSchema = z.object({
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória')
})

type ExtractionFormData = z.infer<typeof extractionSchema>

export default function JiraExtractor() {
  const { configuration } = useJiraConfig()
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)

  const form = useForm<ExtractionFormData>({
    resolver: zodResolver(extractionSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  })

  const onSubmit = async (data: ExtractionFormData) => {
    if (!configuration) {
      toast.error('Configure suas credenciais do Jira primeiro')
      return
    }

    setExtracting(true)
    setProgress(0)

    try {
      // Simular progresso durante a extração
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/jira/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: data.startDate,
          endDate: data.endDate
        })
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao extrair dados')
      }

      // Download do arquivo
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

      toast.success('Dados extraídos com sucesso!')
    } catch (error) {
      console.error('Erro na extração:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao extrair dados')
    } finally {
      setExtracting(false)
      setProgress(0)
    }
  }

  if (!configuration) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configure o Jira</h3>
          <p className="text-muted-foreground mb-4">
            Configure suas credenciais do Jira para começar a extrair dados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Extrair Dados do Jira</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              {...form.register('startDate')}
            />
            {form.formState.errors.startDate && (
              <p className="text-sm text-red-500">
                {form.formState.errors.startDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data de Fim</Label>
            <Input
              id="endDate"
              type="date"
              {...form.register('endDate')}
            />
            {form.formState.errors.endDate && (
              <p className="text-sm text-red-500">
                {form.formState.errors.endDate.message}
              </p>
            )}
          </div>

          {extracting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extraindo dados...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={extracting}>
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extraindo...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
               Extrair Dados
             </>
           )}
         </Button>
       </form>
     </CardContent>
   </Card>
 )
}