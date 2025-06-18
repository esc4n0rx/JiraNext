// app/api/jira/devolucoes/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params antes de usar
    const { id } = await params;
    
    const extractionId = parseInt(id, 10);
    if (isNaN(extractionId)) {
      return NextResponse.json({ error: 'ID de extração inválido.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('extraction_devolucoes')
      .select('*')
      .eq('extraction_id', extractionId);

    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Nenhum dado encontrado.' }, { status: 404 });

    const excelData = data.map(item => ({
      'Chave': item.log_key,
      'Criado em': item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : '',
      'Quem Abriu': item.reporter,
      'Loja': item.loja,
      'Tipo': item.tipo,
      'Status': item.status
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Devoluções');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="relatorio_devolucoes_${extractionId}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}