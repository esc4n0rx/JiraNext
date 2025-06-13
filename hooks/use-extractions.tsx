// hooks/use-extractions.tsx
"use client"

import { useState, useEffect } from 'react'

interface ExtractionStatus {
  id: string
  status: 'processing' | 'completed' | 'error'
  progress: number
  currentStep: string
  totalIssues?: number
  startDate: string
  endDate: string
  createdAt: string
  completedAt?: string
  errorMessage?: string
  filePath?: string
}

export function useExtractions() {
  const [activeExtractions, setActiveExtractions] = useState<ExtractionStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActiveExtractions = async () => {
    try {
      const response = await fetch('/api/jira/active-extractions')
      if (response.ok) {
        const data = await response.json()
        setActiveExtractions(data)
      }
    } catch (error) {
      console.error('Erro ao buscar extrações ativas:', error)
    } finally {
      setLoading(false)
    }
  }

  const pollExtraction = async (extractionId: string) => {
    try {
      const response = await fetch(`/api/jira/status/${extractionId}`)
      if (response.ok) {
        const status = await response.json()
        
        setActiveExtractions(prev => 
          prev.map(ext => ext.id === extractionId ? status : ext)
        )
        
        return status
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    }
    return null
  }

  useEffect(() => {
    fetchActiveExtractions()
  }, [])

  return {
    activeExtractions,
    loading,
    fetchActiveExtractions,
    pollExtraction
  }
}