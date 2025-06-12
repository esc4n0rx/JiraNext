"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { useConfig } from "@/hooks/use-config"
import { format } from "date-fns"
import { DatePicker } from "@/components/date-picker"
import { mockJiraData } from "@/lib/mock-data"
import { ResultsDialog } from "@/components/results-dialog"

export type JiraIssue = {
  id: string
  key: string
  summary: string
  status: string
  assignee: string
  created: string
  updated: string
}

export const MainCard = () => {
  const { config } = useConfig()
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [data, setData] = useState<JiraIssue[]>([])
  const [resultsOpen, setResultsOpen] = useState(false)

  const fetchData = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecione as datas de início e fim")
      return
    }

    if (endDate < startDate) {
      toast.error("A data final deve ser posterior à data inicial")
      return
    }

    try {
      setIsLoading(true)
      setProgress(0)
      setResultsOpen(false)

      // Simular progresso com intervalos mais visíveis
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 300)

      // Usar dados mockup ou fazer a chamada real à API
      let result: JiraIssue[]

      if (config.useMockData || !config.jiraToken || !config.jiraDomain) {
        // Usar dados mockup após um delay para simular a chamada à API
        await new Promise((resolve) => setTimeout(resolve, 2000))
        result = mockJiraData
      } else {
        // Chamada real à API
        const fromDate = format(startDate, "yyyy-MM-dd")
        const toDate = format(endDate, "yyyy-MM-dd")

        const response = await fetch("/api/jira", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromDate,
            toDate,
            token: config.jiraToken,
            domain: config.jiraDomain,
            apiPath: config.jiraApiPath,
          }),
        })

        if (!response.ok) {
          throw new Error("Falha ao buscar dados do Jira")
        }

        result = await response.json()
      }

      clearInterval(progressInterval)
      setProgress(100)
      setData(result)

      // Mostrar resultados após um breve delay para a barra de progresso completar
      setTimeout(() => {
        setResultsOpen(true)

        // Notificação toast
        toast.success(`${result.length} registros encontrados`, {
          description: "Os dados foram carregados com sucesso!",
        })

        // Notificação push se suportado pelo navegador e permitido
        if (config.notifications && "Notification" in window && Notification.permission === "granted") {
          new Notification("Extração Concluída", {
            body: `${result.length} registros foram extraídos com sucesso.`,
            icon: "/favicon.ico",
          })
        } else if (config.notifications && "Notification" in window && Notification.permission !== "denied") {
          Notification.requestPermission()
        }
      }, 500)
    } catch (error) {
      toast.error("Erro ao buscar dados: " + (error instanceof Error ? error.message : "Erro desconhecido"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Extração de Dados</CardTitle>
          <CardDescription>Selecione o período para extrair dados do Jira</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de início</label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de fim</label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>
          </div>

          <Button onClick={fetchData} disabled={isLoading || !startDate || !endDate} className="w-full">
            {isLoading ? "Buscando dados..." : "Puxar Dados"}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-3 flex-1" />
                <span className="text-xs font-medium">{progress}%</span>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {progress < 100 ? "Coletando dados..." : "Processando resultados..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ResultsDialog open={resultsOpen} onOpenChange={setResultsOpen} data={data} />
    </>
  )
}
