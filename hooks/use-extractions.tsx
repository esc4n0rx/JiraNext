// hooks/use-extractions.tsx
"use client"

import { useState, useEffect } from 'react'

interface ExtractionHistory {
  id: string
  status: 'completed' | 'error'
  totalIssues?: number
  startDate: string
  endDate: string
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

export function useExtractions() {
  const [extractionHistory, setExtractionHistory] = useState<ExtractionHistory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExtractionHistory = async () => {
    try {
      const response = await fetch('/api/jira/extraction-history')
      if (response.ok) {
        const data = await response.json()
        setExtractionHistory(data)
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de extrações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExtractionHistory()
  }, [])

  return {
    extractionHistory,
    loading,
    refreshHistory: fetchExtractionHistory
  }
}