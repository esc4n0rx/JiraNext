// app/api/jira/extract-sync/route.ts
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processJiraIssue, reorganizeData } from '@/lib/jira-utils'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      let extractionId: string | null = null
      
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
            message: 'Configuração do Jira incompleta. Verifique suas credenciais nas configurações.'
          })}\n\n`))
          controller.close()
          return
        }

        // Criar registro de extração imediatamente
        const { data: extraction, error: extractionError } = await supabase
          .from('extractions')
          .insert({
            start_date: startDate,
            end_date: endDate,
            total_issues: 0,
            status: 'processing',
            progress: 0,
            current_step: 'Iniciando extração...',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (extractionError) {
          console.error('Erro ao criar extração:', extractionError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Erro ao inicializar extração no banco de dados'
          })}\n\n`))
          controller.close()
          return
        }

        extractionId = extraction.id

        // Enviar progresso inicial
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 5,
          step: 'Conectando ao Jira...'
        })}\n\n`))

        // Atualizar status no banco
        await supabase
          .from('extractions')
          .update({ 
            progress: 5, 
            current_step: 'Conectando ao Jira...' 
          })
          .eq('id', extractionId)

        // Construir JQL e URL
        const jql = `project = LOG AND created >= "${startDate}" AND created <= "${endDate}"`
        let baseUrl = configuration.jira_url
        
        // Garantir que a URL não termine com barra
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1)
        }
        
        const searchUrl = `${baseUrl}/rest/api/2/search`
        
        // Configurar autenticação
        const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64')
        const headers = {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Jira-Analytics-Pro/1.0'
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 10,
          step: 'Testando conexão com o Jira...'
        })}\n\n`))

        // Teste de conectividade primeiro
        try {
          const testUrl = `${baseUrl}/rest/api/2/myself`
          const testResponse = await Promise.race([
            fetch(testUrl, { headers }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout de conexão')), 10000)
            )
          ]) as Response

          if (!testResponse.ok) {
            const errorText = await testResponse.text()
            throw new Error(`Falha na autenticação: ${testResponse.status} - ${errorText}`)
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            progress: 15,
            step: 'Conexão estabelecida! Buscando dados...'
          })}\n\n`))

        } catch (testError) {
          console.error('Erro no teste de conectividade:', testError)
          
          await supabase
            .from('extractions')
            .update({ 
              status: 'error',
              error_message: `Erro de conectividade: ${testError instanceof Error ? testError.message : 'Erro desconhecido'}`
            })
            .eq('id', extractionId)

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: `Erro de conectividade com o Jira: ${testError instanceof Error ? testError.message : 'Erro desconhecido'}`
          })}\n\n`))
          controller.close()
          return
        }

        let allIssues: any[] = []
        let startAt = 0
        const maxResults = 50 // Reduzir para evitar timeouts

        // Primeira requisição para obter total
        const firstUrl = `${searchUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=0&fields=*all`
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 20,
          step: 'Executando consulta JQL...'
        })}\n\n`))

        const firstResponse = await fetch(firstUrl, { 
          headers
        })

        if (!firstResponse.ok) {
          const errorText = await firstResponse.text()
          const errorMessage = `Erro na consulta Jira: ${firstResponse.status} - ${errorText}`
          
          await supabase
            .from('extractions')
            .update({ 
              status: 'error',
              error_message: errorMessage
            })
            .eq('id', extractionId)

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: errorMessage
          })}\n\n`))
          controller.close()
          return
        }

        const firstData = await firstResponse.json()
        allIssues.push(...firstData.issues)

        const totalPages = Math.ceil(firstData.total / maxResults)
        const totalIssues = firstData.total

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 25,
          step: `Encontradas ${totalIssues} issues. Carregando dados (${totalPages} páginas)...`
        })}\n\n`))

        // Atualizar total no banco
        await supabase
          .from('extractions')
          .update({ 
            total_issues: totalIssues,
            progress: 25,
            current_step: `Carregando ${totalIssues} issues...`
          })
          .eq('id', extractionId)

        // Buscar páginas restantes com controle de erro
        for (let page = 1; page < totalPages; page++) {
          startAt = page * maxResults
          
          const pageUrl = `${searchUrl}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=*all`
          
          try {
            const response = await fetch(pageUrl, { 
              headers,
            })

            if (response.ok) {
              const data = await response.json()
              allIssues.push(...data.issues)
            } else {
              console.warn(`Erro na página ${page + 1}: ${response.status}`)
              // Continuar com as outras páginas
            }

            // Atualizar progresso (páginas representam 25% a 60% do progresso)
            const pageProgress = 25 + ((page / totalPages) * 35)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              progress: Math.round(pageProgress),
              step: `Carregando página ${page + 1}/${totalPages}... (${allIssues.length} issues)`
            })}\n\n`))

            // Atualizar progresso no banco a cada 5 páginas
            if (page % 5 === 0) {
              await supabase
                .from('extractions')
                .update({ 
                  progress: Math.round(pageProgress),
                  current_step: `Carregando página ${page + 1}/${totalPages}...`
                })
                .eq('id', extractionId)
            }

            // Pequeno delay para evitar rate limiting
            if (page % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }

          } catch (pageError) {
            console.warn(`Erro na página ${page + 1}:`, pageError)
            // Continuar com as próximas páginas
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 60,
          step: `Processando ${allIssues.length} issues extraídas...`
        })}\n\n`))

        // Processar dados
        let processedData: any[] = []
        
        for (let i = 0; i < allIssues.length; i++) {
          try {
            const issue = allIssues[i]
            const issueData = processJiraIssue(issue)
            processedData.push(...issueData)
            
            // Atualizar progresso a cada 50 issues
            if (i % 50 === 0) {
              const processProgress = 60 + ((i / allIssues.length) * 20)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                progress: Math.round(processProgress),
                step: `Processando issue ${i + 1}/${allIssues.length}...`
              })}\n\n`))
            }
          } catch (processError) {
            console.error(`Erro ao processar issue ${i}:`, processError)
            // Continuar com as próximas issues
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 80,
          step: 'Reorganizando e validando dados...'
        })}\n\n`))

        // Reorganizar dados
        const finalData = reorganizeData(processedData)
        const uniqueLogs = [...new Set(finalData.map(item => item.LOG).filter(log => log))]

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 85,
          step: 'Salvando dados no banco...'
        })}\n\n`))

        // Salvar dados processados
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

          // Inserir em lotes menores para performance
          const batchSize = 50
          for (let i = 0; i < dataToInsert.length; i += batchSize) {
            const batch = dataToInsert.slice(i, i + batchSize)
            
            try {
              await supabase
                .from('extraction_data')
                .insert(batch)

              // Atualizar progresso do salvamento
              const saveProgress = 85 + ((i / dataToInsert.length) * 10)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                progress: Math.round(saveProgress),
                step: `Salvando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(dataToInsert.length/batchSize)}...`
              })}\n\n`))
            } catch (insertError) {
              console.error('Erro ao inserir lote:', insertError)
              // Continuar com os próximos lotes
            }
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 95,
          step: 'Finalizando extração...'
        })}\n\n`))

        // Atualizar registro final da extração
        await supabase
          .from('extractions')
          .update({
            status: 'completed',
            progress: 100,
            current_step: 'Concluído',
            completed_at: new Date().toISOString(),
            total_issues: uniqueLogs.length
          })
          .eq('id', extractionId)

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalIssues: uniqueLogs.length,
          downloadUrl: `/api/jira/download-extraction/${extractionId}`,
          fileName: `jira_extraction_${extractionId}.xlsx`
        })}\n\n`))

        controller.close()

      } catch (error) {
        console.error('Erro geral na extração:', error)
        
        // Marcar extração como erro no banco se tivermos o ID
        if (extractionId) {
          await supabase
            .from('extractions')
            .update({ 
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido'
            })
            .eq('id', extractionId)
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido na extração'
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

// Função auxiliar para converter strings de data (melhorada)
function parseDate(dateString: string): string | null {
  if (!dateString || dateString.trim() === '') return null
  
  try {
    // Tentar parsing direto primeiro
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      // Tentar formato brasileiro DD/MM/YYYY
      const parts = dateString.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        const brDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(brDate.getTime())) {
          return brDate.toISOString()
        }
      }
      
      // Tentar formato americano MM/DD/YYYY
      if (parts.length === 3) {
        const [month, day, year] = parts
        const usDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(usDate.getTime())) {
          return usDate.toISOString()
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