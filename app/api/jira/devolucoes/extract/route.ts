// app/api/jira/devolucoes/extract/route.ts
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { processDevolucoesIssue } from '@/lib/jira-utils';
import { JiraIssue } from '@/types/jira';

// JQL Fixo para Devoluções
const DEVOLUCOES_JQL = 'project = LOG AND "Request Type" = "Devolução aos CDs por avarias de validade" AND "Centro de distribuição de destino (CD)" = "CD Pavuna RJ (CD03)" ORDER BY priority ASC, "Tempo de resolução" ASC';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let extractionId: number | null = null;
      
      const sendProgress = (progress: number, step: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', progress, step })}\n\n`));
      };

      try {
        const userId = '7ba72693-76cd-4d5c-ac54-b41a260f69cc'; 

        const { data: configuration, error: configError } = await supabaseAdmin
          .from('user_configurations')
          .select('jira_domain, jira_email, jira_token')
          .eq('user_id', userId)
          .single();
        
        if (configError || !configuration) throw new Error(`Falha ao buscar configuração do Jira: ${configError?.message}`);
        if (!configuration.jira_domain || !configuration.jira_email || !configuration.jira_token) throw new Error('Credenciais do Jira estão incompletas.');

        sendProgress(0, 'Iniciando extração de Devoluções...');
        const now = new Date().toISOString();
        const { data: extraction, error: extractionError } = await supabaseAdmin
          .from('extractions')
          .insert({ type: 'devolucao', status: 'processing', jql_query: DEVOLUCOES_JQL, start_date: now, end_date: now })
          .select('id')
          .single();

        if (extractionError || !extraction) throw new Error(`Falha ao criar registro de extração: ${extractionError?.message}`);
        extractionId = extraction.id;

        const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

        const allIssues: JiraIssue[] = [];
        let startAt = 0;
        let isLast = false;
        let totalIssues = 0;

        sendProgress(10, 'Buscando issues do Jira...');
        
        while (!isLast) {
          const searchUrl = `${configuration.jira_domain}/rest/api/2/search`;
          const body = JSON.stringify({
            jql: DEVOLUCOES_JQL,
            startAt,
            maxResults: 100,
            fields: ['key', 'created', 'reporter', 'customfield_10169', 'customfield_11218', 'status'],
          });

          const response = await fetch(searchUrl, { method: 'POST', headers, body });
          if (!response.ok) throw new Error(`Erro na API do Jira: ${response.statusText}`);

          const pageData = await response.json();
          if (startAt === 0) totalIssues = pageData.total;
          allIssues.push(...pageData.issues);
          startAt += pageData.issues.length;
          isLast = totalIssues === 0 ? true : startAt >= totalIssues;
          
          sendProgress(10 + (totalIssues > 0 ? (allIssues.length / totalIssues) * 40 : 40), `Buscando... ${allIssues.length}/${totalIssues} issues encontradas`);
        }
        
        sendProgress(50, `Processando ${allIssues.length} issues...`);
        const processedData = allIssues.map(processDevolucoesIssue);

        sendProgress(90, 'Salvando dados processados...');
        if (processedData.length > 0) {
            const dataToInsert = processedData.map(item => ({
                extraction_id: extractionId,
                log_key: item['Chave'],
                criado_em: item['Criado em'],
                reporter: item['Quem Abriu'],
                loja: item['Loja'],
                tipo: item['Tipo'],
                status: item['Status']
            }));
            
            const { error: insertError } = await supabaseAdmin.from('extraction_devolucoes').insert(dataToInsert);
            if (insertError) throw new Error(`Falha ao salvar dados no banco: ${insertError.message}`);
        }

        await supabaseAdmin.from('extractions').update({ status: 'completed', total_issues: allIssues.length, completed_at: new Date().toISOString() }).eq('id', extractionId);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            totalIssues: allIssues.length,
            downloadUrl: `/api/jira/devolucoes/download/${extractionId}`,
            fileName: `devolucoes_jira_${extractionId}.xlsx`
        })}\n\n`));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (extractionId) await supabaseAdmin.from('extractions').update({ status: 'error', error_message: errorMessage }).eq('id', extractionId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}