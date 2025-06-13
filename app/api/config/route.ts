
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = '7ba72693-76cd-4d5c-ac54-b41a260f69cc' 

    const { data: config, error } = await supabase
      .from('user_configurations')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configurações:', error)
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
    }

    if (!config) {
      return NextResponse.json({
        jira_email: '',
        jira_token: '',
        jira_domain: '',
        jira_api_path: '/rest/api/3/search',
        notifications: true,
        use_mock_data: false
      })
    }

    return NextResponse.json({
      jira_email: config.jira_email || '',
      jira_token: config.jira_token || '',
      jira_domain: config.jira_domain || '',
      jira_api_path: config.jira_api_path || '/rest/api/3/search',
      notifications: config.notifications !== false,
      use_mock_data: config.use_mock_data === true
    })

  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = '7ba72693-76cd-4d5c-ac54-b41a260f69cc'

    const {
      jira_email,
      jira_token,
      jira_domain,
      jira_api_path,
      notifications,
      use_mock_data
    } = body

    // Verificar se já existe configuração para este usuário
    const { data: existingConfig } = await supabase
      .from('user_configurations')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result

    if (existingConfig) {
      // Atualizar configuração existente
      const { data, error } = await supabase
        .from('user_configurations')
        .update({
          jira_email,
          jira_token,
          jira_domain,
          jira_api_path: jira_api_path || '/rest/api/3/search',
          notifications: notifications !== false,
          use_mock_data: use_mock_data === true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Criar nova configuração
      const { data, error } = await supabase
        .from('user_configurations')
        .insert({
          user_id: userId,
          jira_email,
          jira_token,
          jira_domain,
          jira_api_path: jira_api_path || '/rest/api/3/search',
          notifications: notifications !== false,
          use_mock_data: use_mock_data === true
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      config: {
        jira_email: result.jira_email || '',
        jira_token: result.jira_token || '',
        jira_domain: result.jira_domain || '',
        jira_api_path: result.jira_api_path || '/rest/api/3/search',
        notifications: result.notifications !== false,
        use_mock_data: result.use_mock_data === true
      }
    })

  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}