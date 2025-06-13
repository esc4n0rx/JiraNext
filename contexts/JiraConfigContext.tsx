// contexts/JiraConfigContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { JiraConfiguration } from '@/types/jira'
import { supabase } from '@/lib/supabase'

interface JiraConfigContextType {
  configuration: JiraConfiguration | null
  loading: boolean
  saveConfiguration: (config: Partial<JiraConfiguration>) => Promise<void>
  refreshConfiguration: () => Promise<void>
}

const JiraConfigContext = createContext<JiraConfigContextType | undefined>(undefined)

export function JiraConfigProvider({ children }: { children: ReactNode }) {
  const [configuration, setConfiguration] = useState<JiraConfiguration | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('user_configurations')
        .select('*')
        .limit(1)
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
    try {
      const configData = {
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
  }, [])

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