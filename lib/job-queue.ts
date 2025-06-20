// lib/job-queue.ts
import { supabase } from '@/lib/supabase'

export type JobType = 'divergencias' | 'avarias' | 'qualidade' | 'devolucoes'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface JobData {
  id: string
  type: JobType
  status: JobStatus
  progress: number
  current_step: string
  data: any
  result?: any
  error_message?: string
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  retry_count: number
  max_retries: number
}

export class JobQueue {
  private static instance: JobQueue
  private isProcessing = false

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue()
    }
    return JobQueue.instance
  }

  async createJob(type: JobType, data: any): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { error } = await supabase
      .from('extraction_jobs')
      .insert({
        id: jobId,
        type,
        status: 'pending',
        progress: 0,
        current_step: 'Aguardando processamento...',
        data: JSON.stringify(data),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3
      })

    if (error) {
      console.error('Erro ao criar job:', error)
      throw new Error('Falha ao criar job de extração')
    }

    return jobId
  }

  async updateJob(jobId: string, updates: Partial<JobData>): Promise<void> {
    const { error } = await supabase
      .from('extraction_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('Erro ao atualizar job:', error)
      throw new Error('Falha ao atualizar job')
    }
  }

  async getJob(jobId: string): Promise<JobData | null> {
    const { data, error } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Erro ao buscar job:', error)
      return null
    }

    return {
      ...data,
      data: JSON.parse(data.data || '{}'),
      result: data.result ? JSON.parse(data.result) : null
    }
  }

  async getNextPendingJob(): Promise<JobData | null> {
    const { data, error } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return {
      ...data,
      data: JSON.parse(data.data || '{}'),
      result: data.result ? JSON.parse(data.result) : null
    }
  }

  async markJobAsProcessing(jobId: string): Promise<void> {
    await this.updateJob(jobId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      current_step: 'Iniciando processamento...'
    })
  }

  async markJobAsCompleted(jobId: string, result: any): Promise<void> {
    await this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      current_step: 'Concluído',
      result: JSON.stringify(result),
      completed_at: new Date().toISOString()
    })
  }

  async markJobAsFailed(jobId: string, errorMessage: string): Promise<void> {
    const job = await this.getJob(jobId)
    if (!job) return

    const shouldRetry = job.retry_count < job.max_retries
    
    await this.updateJob(jobId, {
      status: shouldRetry ? 'pending' : 'failed',
      error_message: errorMessage,
      retry_count: job.retry_count + 1,
      current_step: shouldRetry ? 'Aguardando nova tentativa...' : 'Falhou após múltiplas tentativas'
    })
  }

  async updateProgress(jobId: string, progress: number, currentStep: string): Promise<void> {
    await this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      current_step: currentStep
    })
  }
}

export const jobQueue = JobQueue.getInstance()