// hooks/use-custom-toast.tsx
"use client"

import { toast } from 'sonner'

interface CustomToastOptions {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  important?: boolean
}

export function useCustomToast() {
  const showSuccess = (message: string, options?: CustomToastOptions) => {
    return toast.success(options?.title || message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || (options?.important ? 8000 : 4000),
      style: {
        backgroundColor: 'rgb(240, 253, 244)',
        color: 'rgb(22, 101, 52)',
        border: '1px solid rgb(187, 247, 208)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  const showError = (message: string, options?: CustomToastOptions) => {
    return toast.error(options?.title || message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || (options?.important ? 10000 : 6000),
      style: {
        backgroundColor: 'rgb(254, 242, 242)',
        color: 'rgb(127, 29, 29)',
        border: '1px solid rgb(254, 202, 202)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  const showWarning = (message: string, options?: CustomToastOptions) => {
    return toast.warning(options?.title || message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 5000,
      style: {
        backgroundColor: 'rgb(255, 251, 235)',
        color: 'rgb(120, 53, 15)',
        border: '1px solid rgb(254, 215, 170)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  const showInfo = (message: string, options?: CustomToastOptions) => {
    return toast.info(options?.title || message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 4000,
      style: {
        backgroundColor: 'rgb(239, 246, 255)',
        color: 'rgb(30, 64, 175)',
        border: '1px solid rgb(191, 219, 254)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  const showLoading = (message: string, options?: Omit<CustomToastOptions, 'duration'>) => {
    return toast.loading(options?.title || message, {
      description: options?.description,
      action: options?.action,
      style: {
        backgroundColor: 'rgb(248, 250, 252)',
        color: 'rgb(51, 65, 85)',
        border: '1px solid rgb(203, 213, 225)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  const showCustom = (content: React.ReactNode, options?: CustomToastOptions) => {
    return toast.custom(() => <>{content}</>, {
      duration: options?.duration || 4000,
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        color: 'rgb(9, 9, 11)',
        border: '1px solid rgb(228, 228, 231)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    })
  }

  // Método especial para extrações com melhor legibilidade
  const showExtractionSuccess = (totalIssues: number, startDate: string, endDate: string) => {
    return showSuccess('🎉 Extração Concluída!', {
      title: 'Extração do Jira Finalizada',
      description: `${totalIssues} registros extraídos (${startDate} - ${endDate})\n📥 Download automático iniciado!`,
      action: {
        label: 'Ver Dashboard',
        onClick: () => console.log('Navegando para dashboard...')
      },
      duration: 8000,
      important: true
    })
  }

  const showExtractionError = (errorMessage: string) => {
    return showError('❌ Erro na Extração', {
      title: 'Falha na Extração do Jira',
      description: `${errorMessage}\n\nVerifique suas credenciais e tente novamente.`,
      action: {
        label: 'Tentar Novamente',
        onClick: () => console.log('Retry extraction...')
      },
      duration: 12000,
      important: true
    })
  }

  const showDownloadComplete = (fileName: string) => {
    return showSuccess('📁 Download Concluído!', {
      title: 'Arquivo Baixado',
      description: `${fileName} foi salvo com sucesso.\nVerifique sua pasta de Downloads.`,
      duration: 5000
    })
  }

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    custom: showCustom,
    extractionSuccess: showExtractionSuccess,
    extractionError: showExtractionError,
    downloadComplete: showDownloadComplete,
    dismiss: toast.dismiss,
    promise: toast.promise
  }
}