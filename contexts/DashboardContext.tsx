// contexts/DashboardContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DashboardData, ExtractedData, ExtractionReport } from '@/types/dashboard'

interface DashboardContextType {
  dashboardData: DashboardData | null
  extractionReports: ExtractionReport[]
  loading: boolean
  refreshDashboard: () => Promise<void>
  getReportData: (reportId: string) => Promise<ExtractedData[]>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [extractionReports, setExtractionReports] = useState<ExtractionReport[]>([])
  const [loading, setLoading] = useState(true)

  const refreshDashboard = async () => {
    setLoading(true)
    try {
      // Buscar dados da última extração real
      const response = await fetch('/api/dashboard/latest')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }

      // Buscar relatórios de extração reais
      const reportsResponse = await fetch('/api/dashboard/reports')
      if (reportsResponse.ok) {
        const reports = await reportsResponse.json()
        setExtractionReports(reports)
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getReportData = async (reportId: string): Promise<ExtractedData[]> => {
    const response = await fetch(`/api/dashboard/report/${reportId}`)
    if (!response.ok) throw new Error('Erro ao carregar dados do relatório')
    return response.json()
  }

  useEffect(() => {
    refreshDashboard()
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        dashboardData,
        extractionReports,
        loading,
        refreshDashboard,
        getReportData
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard deve ser usado dentro de DashboardProvider')
  }
  return context
}