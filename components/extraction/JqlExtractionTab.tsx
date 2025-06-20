// components/extraction/JqlExtractionTab.tsx
"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useConfig } from '@/hooks/use-config'
import { toast } from 'sonner'
import AsyncExtractionManager from './AsyncExtractionManager'
import { JobType } from '@/lib/job-queue'

interface JqlExtractionTabProps {
  title: string
  description: string
  defaultJql: string
  isJqlEditable?: boolean
  jobType: JobType
}

export function JqlExtractionTab({
  title,
  description,
  defaultJql,
  isJqlEditable = false,
  jobType
}: JqlExtractionTabProps) {
  const { config } = useConfig()
  const [jql, setJql] = useState(defaultJql)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionData, setExtractionData] = useState<any>(null)

  const handleExtract = async () => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro.')
      return
    }

    setIsExtracting(true)
    setExtractionData({
      configuration: {
        jira_domain: config.jiraDomain,
        jira_email: config.jiraEmail,
        jira_token: config.jiraToken
      },
      jql: isJqlEditable ? jql : defaultJql
    })
  }

  const handleJobComplete = (result: any) => {
    setIsExtracting(false)
    
    // Toast detalhado de sucesso
    toast.success(
      `🎉 ${title} concluída! ${result.totalIssues} issues processadas.`,
      {
        duration: 5000,
        action: {
          label: 'Ver Relatórios',
          onClick: () => {
            console.log('Navegando para relatórios...')
          }
        }
      }
    )
  }

  const handleJobError = (error: string) => {
    setIsExtracting(false)
    
    // Toast de erro com opção de retry
    toast.error(
      `❌ Erro na ${title}: ${error}`,
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

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={`jql-${title}`}>Consulta JQL</Label>
          <Textarea
            id={`jql-${title}`}
            value={jql}
            onChange={(e) => isJqlEditable && setJql(e.target.value)}
            readOnly={!isJqlEditable}
           className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
           rows={4}
         />
         {isJqlEditable && (
           <p className="text-xs text-gray-500">
             💡 Dica: Use JQL válido do Jira. Ex: project = "LOG" AND status = "Open"
           </p>
         )}
       </div>

       {!isExtracting && (
         <Button onClick={handleExtract} className="w-full h-11">
           <Download className="mr-2 h-4 w-4" />
           Iniciar Extração
         </Button>
       )}

       {/* Gerenciador de Extração Assíncrona com Download Automático */}
       {isExtracting && extractionData && (
         <AsyncExtractionManager
           jobType={jobType}
           jobData={extractionData}
           onJobComplete={handleJobComplete}
           onJobError={handleJobError}
           autoDownload={true} // Habilitar download automático para todas as extrações
         />
       )}
     </CardContent>
   </Card>
 )
}