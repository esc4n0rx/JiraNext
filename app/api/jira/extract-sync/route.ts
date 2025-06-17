// app/api/jira/extract-sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processJiraIssue, reorganizeData } from '@/lib/jira-utils'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { startDate, endDate, configuration } = await request.json()

        if (!startDate || !endDate || !configuration) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Parâmetros obrigatórios não fornecidos'
          })}\n\n`))
          controller.close()
          return
        }

        // Validar configuração do Jira
        if (!configuration.jira_url || !configuration.jira_email || !configuration.jira_token) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Configuração do Jira incompleta'
          })}\n\n`))
          controller.close()
          return
        }

        // Enviar progresso inicial
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 5,
          step: 'Conectando ao Jira...'
        })}\n\n`))

        // Construir JQL
        const jql = `project = LOG AND created >= "${startDate}" AND created <= "${endDate}"`
        const baseUrl = `${configuration.jira_url}/rest/api/2/search`
        
        // Configurar autenticação
        const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64')
        const headers = {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 10,
          step: 'Buscando dados do Jira...'
        })}\n\n`))

        let allIssues: any[] = []
        let startAt = 0
        const maxResults = 100

        // Primeira requisição para obter total
        const firstUrl = `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=0&fields=*all`
        
        const firstResponse = await fetch(firstUrl, { headers })

        if (!firstResponse.ok) {
          const errorText = await firstResponse.text()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: `Erro na API do Jira: ${firstResponse.status} - ${errorText}`
          })}\n\n`))
          controller.close()
          return
        }

        const firstData = await firstResponse.json()
        allIssues.push(...firstData.issues)

        const totalPages = Math.ceil(firstData.total / maxResults)

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 20,
          step: `Encontradas ${firstData.total} issues. Carregando páginas...`
        })}\n\n`))

        // Buscar páginas restantes
        for (let page = 1; page < totalPages; page++) {
          startAt = page * maxResults
          
          const pageUrl = `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=*all`
          
          const response = await fetch(pageUrl, { headers })

          if (response.ok) {
            const data = await response.json()
            allIssues.push(...data.issues)
          }

          // Atualizar progresso (páginas representam 20% a 50% do progresso)
          const pageProgress = 20 + ((page / totalPages) * 30)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            progress: Math.round(pageProgress),
            step: `Carregando página ${page + 1}/${totalPages}...`
          })}\n\n`))
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 50,
          step: 'Processando dados das issues...'
        })}\n\n`))

        // Processar dados
        let processedData: any[] = []
        
        allIssues.forEach((issue, index) => {
          try {
            const issueData = processJiraIssue(issue)
            processedData.push(...issueData)
            
            // Atualizar progresso a cada 100 issues
            if (index % 100 === 0) {
              const processProgress = 50 + ((index / allIssues.length) * 20)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                progress: Math.round(processProgress),
                step: `Processando issue ${index + 1}/${allIssues.length}...`
              })}\n\n`))
            }
          } catch (processError) {
            console.error(`Erro ao processar issue ${index}:`, processError)
          }
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 70,
          step: 'Reorganizando dados...'
        })}\n\n`))

        // Reorganizar dados
        const finalData = reorganizeData(processedData)
        const uniqueLogs = [...new Set(finalData.map(item => item.LOG).filter(log => log))]
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 80,
          step: 'Salvando no banco de dados...'
        })}\n\n`))

        // Criar registro de extração
        const { data: extraction, error: extractionError } = await supabase
          .from('extractions')
          .insert({
            start_date: startDate,
            end_date: endDate,
            total_issues: uniqueLogs.length,
            status: 'completed',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .select()
          .single()

        if (extractionError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Erro ao salvar registro de extração'
          })}\n\n`))
          controller.close()
          return
        }

        // Salvar dados processados
        if (finalData.length > 0) {
          const dataToInsert = finalData.map(item => ({
            extraction_id: extraction.id,
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

          // Inserir em lotes para performance
          const batchSize = 100
          for (let i = 0; i < dataToInsert.length; i += batchSize) {
            const batch = dataToInsert.slice(i, i + batchSize)
            
            await supabase
              .from('extraction_data')
              .insert(batch)

            // Atualizar progresso do salvamento
            const saveProgress = 80 + ((i / dataToInsert.length) * 15)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              progress: Math.round(saveProgress),
              step: `Salvando lote ${Math.floor(i/batchSize) + 1}...`
            })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 95,
          step: 'Gerando arquivo Excel...'
        })}\n\n`))

        // Gerar arquivo Excel
        const excelData = finalData.map(item => ({
          LOG: item.LOG || '',
          Status: item.Status || '',
          'Data de Criação': item['Data de Criação'] || '',
          'Tipo de CD': item['Tipo de CD'] || '',
          'Tipo de Divergencia': item['Tipo de Divergencia'] || '',
          'Data de Recebimento': item['Data de Recebimento'] || '',
          Loja: item.Loja || '',
          Categoria: item.Categoria || '',
          Material: item.Material || '',
          'Quantidade Cobrada': item['Quantidade Cobrada'] || '',
          'Quantidade Recebida': item['Quantidade Recebida'] || '',
          'Quantidade de KG cobrada': item['Quantidade de KG cobrada'] || '',
          'Quantidade de KG recebida': item['Quantidade de KG recebida'] || ''
        }))

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')

        // Salvar arquivo temporariamente (você pode implementar upload para storage)
        const fileName = `jira_extraction_${extraction.id}.xlsx`
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalIssues: uniqueLogs.length,
          downloadUrl: `/api/jira/download-extraction/${extraction.id}`,
          fileName: fileName
        })}\n\n`))

        controller.close()

      } catch (error) {
        console.error('Erro na extração:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
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