// hooks/use-download.tsx
"use client"

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useNotifications } from './use-notifications'

interface DownloadState {
  isDownloading: boolean
  progress: number
  error: string | null
}

export function useDownload() {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    error: null
  })
  
  const { notifyDownloadCompleted } = useNotifications()

  const downloadFile = useCallback(async (
    downloadUrl: string, 
    fileName: string,
    options: {
      showToast?: boolean
      showNotification?: boolean
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<boolean> => {
    const { 
      showToast = true, 
      showNotification = false,
      onProgress 
    } = options

    if (!downloadUrl) {
      if (showToast) {
        toast.error('URL de download não fornecida')
      }
      return false
    }

    try {
      setDownloadState({
        isDownloading: true,
        progress: 0,
        error: null
      })

      if (showToast) {
        toast.loading('📥 Preparando download...', { id: 'download-toast' })
      }

      // Simular progresso inicial
      setDownloadState(prev => ({ ...prev, progress: 10 }))
      onProgress?.(10)

      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`)
      }

      // Verificar Content-Length para progresso real
      const contentLength = response.headers.get('Content-Length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      setDownloadState(prev => ({ ...prev, progress: 30 }))
      onProgress?.(30)

      let blob: Blob

      if (total > 0 && response.body) {
        // Download com progresso real
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          chunks.push(value)
          receivedLength += value.length
          
          const progress = Math.round((receivedLength / total) * 70) + 30 // 30-100%
          setDownloadState(prev => ({ ...prev, progress }))
          onProgress?.(progress)
        }

        // Reconstituir o blob
        const allChunks = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          allChunks.set(chunk, position)
          position += chunk.length
        }
        blob = new Blob([allChunks])
      } else {
        // Download simples sem progresso
        blob = await response.blob()
        setDownloadState(prev => ({ ...prev, progress: 90 }))
        onProgress?.(90)
      }

      // Verificar se o blob tem conteúdo
      if (blob.size === 0) {
        throw new Error('Arquivo está vazio ou corrompido')
      }

      // Criar URL e iniciar download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName || 'download.xlsx'
      
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)

      setDownloadState({
        isDownloading: false,
        progress: 100,
        error: null
      })
      onProgress?.(100)

      if (showToast) {
        toast.success('📁 Arquivo baixado com sucesso!', { 
          id: 'download-toast',
          duration: 3000
        })
      }

      if (showNotification) {
        notifyDownloadCompleted(fileName)
      }
      
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      setDownloadState({
        isDownloading: false,
        progress: 0,
        error: errorMessage
      })

      console.error('Erro ao baixar arquivo:', error)
      
      if (showToast) {
        toast.error(`❌ Erro ao baixar: ${errorMessage}`, { 
          id: 'download-toast',
          duration: 5000
        })
      }
      
      return false
    }
  }, [notifyDownloadCompleted])

  const resetDownloadState = useCallback(() => {
    setDownloadState({
      isDownloading: false,
      progress: 0,
      error: null
    })
  }, [])

  return {
    downloadFile,
    downloadState,
    resetDownloadState,
    isDownloading: downloadState.isDownloading,
    progress: downloadState.progress,
    error: downloadState.error
  }
}