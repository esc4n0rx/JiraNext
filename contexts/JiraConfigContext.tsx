// contexts/JiraConfigContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import { JiraConfiguration } from '@/types/jira'

interface JiraConfigContextType {
  configuration: JiraConfiguration | null
  loading: boolean
  saveConfiguration: (config: Partial<JiraConfiguration>) => Promise<void>
  refreshConfiguration: () => Promise<void>
}

const JiraConfigContext = createContext<JiraConfigContextType | undefined>(undefined)

export function JiraConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [configuration, setConfiguration] = useState<JiraConfiguration | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfiguration = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configuração:', error)
        return
      }

      setConfiguration(data)
    } catch (error) {
      console.error('Erro ao buscar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async (config: Partial<JiraConfiguration>) => {
    if (!user) return

    try {
      const configData = {
        user_id: user.id,
        ...config,
        updated_at: new Date().toISOString()
      }

      const { data, error } = configuration
        ? await supabase
            .from('user_configurations')
            .update(configData)
            .eq('id', configuration.id)
            .select()
            .single()
        : await supabase
            .from('user_configurations')
            .insert(configData)
            .select()
            .single()

      if (error) throw error

      setConfiguration(data)
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      throw error
    }
  }

  const refreshConfiguration = async () => {
    setLoading(true)
    await fetchConfiguration()
  }

  useEffect(() => {
    fetchConfiguration()
  }, [user])

  return (
    <JiraConfigContext.Provider
      value={{
        configuration,
        loading,
        saveConfiguration,
        refreshConfiguration
      }}
    >
      {children}
    </JiraConfigContext.Provider>
  )
}

export function useJiraConfig() {
  const context = useContext(JiraConfigContext)
  if (context === undefined) {
    throw new Error('useJiraConfig deve ser usado dentro de JiraConfigProvider')
  }
  return context
}