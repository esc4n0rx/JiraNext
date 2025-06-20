// app/api/jira/jobs/process/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jobQueue, JobData } from '@/lib/job-queue'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processJiraIssue, reorganizeData, processAvariasIssue, processQualidadeIssue, processDevolucoesIssue } from '@/lib/jira-utils'
import { JiraIssue } from '@/types/jira'

export const maxDuration = 60 // Ajustado para o limite do plano hobby

async function processJiraJob(job: JobData): Promise<any> {
  const { type, data } = job
  const jobId = job.id

  try {
    // Buscar configuração do usuário
    const userId = '7ba72693-76cd-4d5c-ac54-b41a260f69cc'
    const { data: configuration, error: configError } = await supabaseAdmin
      .from('user_configurations')
      .select('jira_domain, jira_email, jira_token')
      .eq('user_id', userId)
      .single()

    if (configError || !configuration) {
      throw new Error(`Falha ao buscar configuração: ${configError?.message}`)
    }

    if (!configuration.jira_domain || !configuration.jira_email || !configuration.jira_token) {
      throw new Error('Credenciais do Jira incompletas')
    }

    await jobQueue.updateProgress(jobId, 5, 'Conectando ao Jira...')

    // Configurar autenticação
    const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }

    // Determinar JQL baseado no tipo
    let jql = ''
    let fieldsToFetch: string[] = []

    switch (type) {
      case 'divergencias':
        jql = `project = LOG AND created >= "${data.startDate}" AND created <= "${data.endDate}"`
        fieldsToFetch = ['key', 'created', 'status', 'customfield_10466', 'customfield_10300', 'customfield_10433', 'customfield_10169', 'customfield_11070', 'customfield_11071', 'customfield_11072', 'customfield_11073', 'customfield_11074', 'customfield_11075', 'customfield_11076', 'customfield_11077', 'customfield_11078', 'customfield_11079', 'customfield_11080', 'customfield_11081', 'customfield_11082', 'customfield_11083', 'customfield_11084', 'customfield_11085', 'customfield_11086', 'customfield_11087', 'customfield_11088', 'customfield_11089', 'customfield_11090', 'customfield_11091', 'customfield_11092', 'customfield_11093', 'customfield_11094']
        break
      case 'avarias':
        jql = 'project = LOG AND "Request Type" = "Informar avaria na entrega - Central de Produção" AND "Centro de Distribuição - Central de Produção" = RJ ORDER BY created DESC, priority DESC'
        fieldsToFetch = ['key', 'created', 'status', 'customfield_10475', 'reporter', 'customfield_10169', 'customfield_11090', 'customfield_10315', 'customfield_11091', 'customfield_10329', 'customfield_11092', 'customfield_10346', 'customfield_11093', 'customfield_10347', 'customfield_11094', 'customfield_10349', 'customfield_10288']
        break
      case 'qualidade':
        jql = 'project = LOG AND "Request Type" = "Qualidade (LOG)" AND "Centro de Distribuição - Central de Produção" = RJ ORDER BY priority ASC, "Tempo de resolução" ASC'
        fieldsToFetch = ['key', 'created', 'status', 'customfield_10475', 'reporter', 'customfield_10169', 'customfield_11090', 'customfield_10315', 'customfield_11091', 'customfield_10329', 'customfield_11092', 'customfield_10346', 'customfield_11093', 'customfield_10347', 'customfield_11094', 'customfield_10348']
        break
      case 'devolucoes':
        jql = 'project = LOG AND "Request Type" = "Devolução aos CDs por avarias de validade" AND "Centro de distribuição de destino (CD)" = "CD Pavuna RJ (CD03)" ORDER BY priority ASC, "Tempo de resolução" ASC'
        fieldsToFetch = ['key', 'created', 'reporter', 'customfield_10169', 'customfield_11218', 'status']
        break
      default:
        throw new Error(`Tipo de job não suportado: ${type}`)
    }

    await jobQueue.updateProgress(jobId, 10, 'Executando consulta JQL...')

    // Buscar dados do Jira com paginação otimizada para tempo limitado
    const searchUrl = `${configuration.jira_domain}/rest/api/2/search`
    const allIssues: JiraIssue[] = []
    let startAt = 0
    const maxResults = 100 // Mantido para eficiência
    let totalIssues = 0

    // Primeira requisição para obter o total
    const firstResponse = await fetch(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jql,
        startAt: 0,
        maxResults,
        fields: fieldsToFetch
      })
    })

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text()
      throw new Error(`Erro na API do Jira: ${firstResponse.status} - ${errorText}`)
    }

    const firstData = await firstResponse.json()
    totalIssues = firstData.total
    allIssues.push(...firstData.issues)

    const totalPages = Math.ceil(totalIssues / maxResults)
    
    // Limitação para processamento dentro do tempo permitido
    const maxPagesToProcess = Math.min(totalPages, 20) // Máximo 20 páginas (2000 issues)
    
    await jobQueue.updateProgress(jobId, 20, `Encontradas ${totalIssues} issues. Processando até ${maxPagesToProcess * maxResults} registros...`)

    // Buscar páginas restantes com limite
    for (let page = 1; page < maxPagesToProcess; page++) {
      startAt = page * maxResults

      try {
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jql,
            startAt,
            maxResults,
            fields: fieldsToFetch
          })
        })

        if (response.ok) {
          const pageData = await response.json()
          allIssues.push(...pageData.issues)
        }

        // Atualizar progresso (20% a 60%)
        const pageProgress = 20 + ((page / maxPagesToProcess) * 40)
        await jobQueue.updateProgress(jobId, Math.round(pageProgress), `Carregando página ${page + 1}/${maxPagesToProcess}...`)

        // Delay reduzido para otimização de tempo
        if (page % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (pageError) {
        console.warn(`Erro na página ${page + 1}:`, pageError)
        // Continuar com as próximas páginas
      }
    }

    await jobQueue.updateProgress(jobId, 65, `Processando ${allIssues.length} issues...`)

    // Processar dados baseado no tipo
    let processedData: any[] = []
    let extractionTable = ''

    switch (type) {
      case 'divergencias':
        processedData = allIssues.flatMap(processJiraIssue)
        processedData = reorganizeData(processedData)
        extractionTable = 'extraction_data'
        break
      case 'avarias':
        processedData = allIssues.flatMap(processAvariasIssue)
        extractionTable = 'extraction_avarias'
        break
      case 'qualidade':
        processedData = allIssues.flatMap(processQualidadeIssue)
        extractionTable = 'extraction_qualidade'
        break
      case 'devolucoes':
        processedData = allIssues.map(processDevolucoesIssue)
        extractionTable = 'extraction_devolucoes'
        break
    }

    await jobQueue.updateProgress(jobId, 80, 'Salvando dados no banco...')

    // Criar registro de extração
    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from('extractions')
      .insert({
        type,
        status: 'completed',
        jql_query: jql,
        start_date: data.startDate || new Date().toISOString(),
        end_date: data.endDate || new Date().toISOString(),
        total_issues: allIssues.length,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (extractionError || !extraction) {
      throw new Error(`Falha ao criar extração: ${extractionError?.message}`)
    }

    const extractionId = extraction.id

    // Salvar dados processados com lotes maiores para otimização
    if (processedData.length > 0) {
      let dataToInsert: any[] = []

      switch (type) {
        case 'divergencias':
          dataToInsert = processedData.map(item => ({
            extraction_id: extractionId,
            log_key: item.LOG || '',
            status: item.Status || '',
            created_date: parseDate(item['Data de Criação']),
            tipo_cd: item['Tipo de CD'] || '',
            tipo_divergencia: item['Tipo de Divergencia'] || '',
            data_recebimento: parseDate(item['Data de Recebimento']),
            loja: item.Loja || '',
            categoria: item.Categoria || '',
            material: item.Material || '',
            quantidade_cobrada: item['Quantidade Cobrada'] || '',
            quantidade_recebida: item['Quantidade Recebida'] || '',
            quantidade_kg_cobrada: item['Quantidade de KG cobrada'] || '',
            quantidade_kg_recebida: item['Quantidade de KG recebida'] || ''
          }))
          break
        case 'avarias':
          dataToInsert = processedData.map(item => ({
            extraction_id: extractionId,
            log_key: item['Chave Log'],
            criado_em: item['Criado em'],
            status: item['Status'],
            created_date: item['Criado'],
            reporter: item['Quem Criou'],
            loja: item['Loja'],
            produto: item['Produto'],
            quantidade: item['Quantidade'],
            tipo_avaria: item['Tipo de Avaria']
          }))
          break
        case 'qualidade':
          dataToInsert = processedData.map(item => ({
            extraction_id: extractionId,
            log_key: item['Log'],
            criado_em: item['Criado em'],
            status: item['Status'],
            data_prox_inventario: item['Data Prox. Inventário'],
            reporter: item['Quem Abriu'],
            loja: item['Loja'],
            produto: item['Produto'],
            quantidade: item['Quantidade']
          }))
          break
        case 'devolucoes':
          dataToInsert = processedData.map(item => ({
            extraction_id: extractionId,
            log_key: item['Chave'],
            criado_em: item['Criado em'],
            reporter: item['Quem Abriu'],
            loja: item['Loja'],
            tipo: item['Tipo'],
            status: item['Status']
          }))
          break
      }

      // Inserir em lotes maiores para otimização
      const batchSize = 100 // Aumentado de 50 para 100
      for (let i = 0; i < dataToInsert.length; i += batchSize) {
        const batch = dataToInsert.slice(i, i + batchSize)
        
        try {
          await supabaseAdmin
            .from(extractionTable)
            .insert(batch)

          const saveProgress = 80 + ((i / dataToInsert.length) * 15)
          await jobQueue.updateProgress(jobId, Math.round(saveProgress), `Salvando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(dataToInsert.length/batchSize)}...`)
        } catch (insertError) {
          console.error('Erro ao inserir lote:', insertError)
        }
      }
    }

    await jobQueue.updateProgress(jobId, 100, 'Concluído')

    return {
      totalIssues: allIssues.length,
      processedRecords: processedData.length,
      extractionId,
      downloadUrl: getDownloadUrl(type, extractionId),
      fileName: `${type}_jira_${extractionId}.xlsx`,
      limitedProcessing: totalPages > 20 ? `Processados ${maxPagesToProcess * maxResults} de ${totalIssues} registros devido ao limite de tempo` : null
    }

  } catch (error) {
    console.error('Erro no processamento do job:', error)
    throw error
  }
}

function getDownloadUrl(type: string, extractionId: number): string {
  switch (type) {
    case 'divergencias':
      return `/api/jira/download-extraction/${extractionId}`
    case 'avarias':
      return `/api/jira/avarias/download/${extractionId}`
    case 'qualidade':
      return `/api/jira/qualidade/download/${extractionId}`
    case 'devolucoes':
      return `/api/jira/devolucoes/download/${extractionId}`
    default:
      return `/api/jira/download-extraction/${extractionId}`
  }
}

function parseDate(dateString: string): string | null {
  if (!dateString || dateString.trim() === '') return null
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      const parts = dateString.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        const brDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(brDate.getTime())) {
          return brDate.toISOString()
        }
      }
      return null
    }
    
    return date.toISOString()
  } catch (error) {
    console.error('Erro ao converter data:', dateString, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const job = await jobQueue.getNextPendingJob()
    
    if (!job) {
      return NextResponse.json({ message: 'Nenhum job pendente' })
    }

    await jobQueue.markJobAsProcessing(job.id)

    try {
      const result = await processJiraJob(job)
      await jobQueue.markJobAsCompleted(job.id, result)
      
      return NextResponse.json({
        success: true,
        jobId: job.id,
        result
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      await jobQueue.markJobAsFailed(job.id, errorMessage)
      
      return NextResponse.json({
        success: false,
        jobId: job.id,
        error: errorMessage
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro no processador de jobs:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}