// app/api/jira/extract-async/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, configuration } = await request.json()

    if (!startDate || !endDate || !configuration) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Validar configuração do Jira
    if (!configuration.jira_url || !configuration.jira_email || !configuration.jira_token) {
      return NextResponse.json(
        { error: 'Configuração do Jira incompleta' },
        { status: 400 }
      )
    }

    console.log('Criando job de extração assíncrona...')
    
    // Criar registro de extração em estado "processing"
    const { data: extraction, error: extractionError } = await supabase
      .from('extractions')
      .insert({
        start_date: startDate,
        end_date: endDate,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (extractionError) {
      console.error('Erro ao criar registro:', extractionError)
      return NextResponse.json(
        { error: 'Erro ao criar registro de extração' },
        { status: 500 }
      )
    }

    // Processar em background (sem await para não bloquear)
    processExtractionInBackground(extraction.id, startDate, endDate, configuration)
      .catch(error => {
        console.error('Erro no processamento em background:', error)
      })

    // Retornar imediatamente com o ID do job
    return NextResponse.json({
      extractionId: extraction.id,
      status: 'processing',
      message: 'Extração iniciada. Use o ID para acompanhar o progresso.'
    })

  } catch (error) {
    console.error('Erro ao iniciar extração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para processar a extração em background
async function processExtractionInBackground(
  extractionId: string, 
  startDate: string, 
  endDate: string, 
  configuration: any
) {
  console.log(`Iniciando processamento em background para extração ${extractionId}`)
  
  try {
    const { processJiraIssue, reorganizeData } = await import('@/lib/jira-utils')
    const XLSX = await import('xlsx')

    // Construir JQL
    const jql = `project = LOG AND created >= "${startDate}" AND created <= "${endDate}"`
    console.log('JQL construída:', jql)
    
    const baseUrl = `${configuration.jira_url}/rest/api/2/search`
    
    // Configurar autenticação
    const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    let allIssues: any[] = []
    let startAt = 0
    const maxResults = 100 // Pode ser maior em background

    // Primeira requisição
    console.log('Fazendo primeira requisição ao Jira...')
    const firstUrl = `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=0&fields=*all`
    
    const firstResponse = await fetch(firstUrl, { headers })

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text()
      throw new Error(`Erro na API do Jira: ${firstResponse.status} - ${errorText}`)
    }

    const firstData = await firstResponse.json()
    console.log('Total de issues encontradas:', firstData.total)
    
    allIssues.push(...firstData.issues)

    // Atualizar progresso inicial
    await updateExtractionProgress(extractionId, 10, 'Carregando páginas de dados...')

    // Buscar páginas restantes
    const totalPages = Math.ceil(firstData.total / maxResults)
    console.log(`Buscando ${totalPages} páginas no total`)

    for (let page = 1; page < totalPages; page++) {
      startAt = page * maxResults
      console.log(`Buscando página ${page + 1}/${totalPages}...`)
      
      const pageUrl = `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=*all`
      
      const response = await fetch(pageUrl, { headers })

      if (!response.ok) {
        console.error(`Erro na página ${page}:`, response.status)
        continue // Continuar com as issues que já temos
      }

      const data = await response.json()
      allIssues.push(...data.issues)

      // Atualizar progresso (páginas representam 10% a 50% do progresso)
      const pageProgress = 10 + ((page / totalPages) * 40)
      await updateExtractionProgress(extractionId, pageProgress, `Processando página ${page + 1}/${totalPages}`)
    }

    console.log(`Total de issues carregadas: ${allIssues.length}`)
    await updateExtractionProgress(extractionId, 50, 'Processando dados das issues...')

    // Processar dados
    let processedData: any[] = []
    
    allIssues.forEach((issue, index) => {
      try {
        const issueData = processJiraIssue(issue)
        processedData.push(...issueData)
        
        // Atualizar progresso a cada 100 issues
        if (index % 100 === 0) {
          const processProgress = 50 + ((index / allIssues.length) * 20)
          updateExtractionProgress(extractionId, processProgress, `Processando issue ${index + 1}/${allIssues.length}`)
            .catch(console.error)
        }
      } catch (processError) {
        console.error(`Erro ao processar issue ${index}:`, processError)
      }
    })

    console.log(`Dados processados: ${processedData.length} registros`)
    await updateExtractionProgress(extractionId, 70, 'Reorganizando dados...')

    // Reorganizar dados
    const finalData = reorganizeData(processedData)
    console.log(`Dados reorganizados: ${finalData.length} registros finais`)

    await updateExtractionProgress(extractionId, 80, 'Salvando no banco de dados...')

    // Salvar dados processados no banco
    if (finalData.length > 0) {
      const dataToInsert = finalData.map(item => ({
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

      // Inserir dados em lotes
      const batchSize = 100
      let insertedCount = 0
      
      for (let i = 0; i < dataToInsert.length; i += batchSize) {
        const batch = dataToInsert.slice(i, i + batchSize)
        
        const { error: insertError } = await supabase
          .from('extraction_data')
          .insert(batch)

        if (!insertError) {
          insertedCount += batch.length
        }

        // Atualizar progresso do salvamento
        const saveProgress = 80 + ((i / dataToInsert.length) * 15)
        await updateExtractionProgress(extractionId, saveProgress, `Salvando lote ${Math.floor(i/batchSize) + 1}`)
      }
      
      console.log(`${insertedCount} registros inseridos no banco`)
    }

    await updateExtractionProgress(extractionId, 95, 'Finalizando...')

    // Calcular logs únicos
    const uniqueLogs = [...new Set(finalData.map(item => item.LOG).filter(log => log))]

    // Atualizar registro de extração com sucesso
    await supabase
      .from('extractions')
      .update({
        total_issues: uniqueLogs.length,
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_path: `jira-extraction-${extractionId}.xlsx`,
        progress: 100
      })
      .eq('id', extractionId)

    console.log(`Extração ${extractionId} concluída com sucesso`)

  } catch (error) {
    console.error(`Erro na extração ${extractionId}:`, error)
    
    // Atualizar registro com erro
    await supabase
      .from('extractions')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      .eq('id', extractionId)
  }
}

// Função auxiliar para atualizar progresso
async function updateExtractionProgress(extractionId: string, progress: number, message: string) {
  try {
    await supabase
      .from('extractions')
      .update({
        progress: Math.round(progress),
        current_step: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
  }
}

// Função auxiliar para converter strings de data
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