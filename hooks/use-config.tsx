// hooks/use-config.tsx
"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import type React from 'react'
import { toast } from 'sonner'

type Config = {
  jiraToken: string
  jiraDomain: string
  jiraEmail: string
  jiraApiPath: string
  notifications: boolean
  useMockData: boolean
}

type ConfigContextType = {
  config: Config
  setConfig: (config: Config) => void
  loading: boolean
  saveConfig: (config: Config) => Promise<void>
  refreshConfig: () => Promise<void>
}

const defaultConfig: Config = {
  jiraToken: "",
  jiraDomain: "",
  jiraEmail: "",
  jiraApiPath: "/rest/api/3/search",
  notifications: true,
  useMockData: false,
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  setConfig: () => {},
  loading: false,
  saveConfig: async () => {},
  refreshConfig: async () => {},
})

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loading, setLoading] = useState(true)

  // Carregar configurações da API
  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config')
      
      if (response.ok) {
        const data = await response.json()
        setConfig({
          jiraToken: data.jira_token || '',
          jiraDomain: data.jira_domain || '',
          jiraEmail: data.jira_email || '',
          jiraApiPath: data.jira_api_path || '/rest/api/3/search',
          notifications: data.notifications !== false,
          useMockData: data.use_mock_data === true
        })
      } else {
        console.error('Erro ao carregar configurações')
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  // Salvar configurações na API
  const saveConfig = async (newConfig: Config) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jira_email: newConfig.jiraEmail,
          jira_token: newConfig.jiraToken,
          jira_domain: newConfig.jiraDomain,
          jira_api_path: newConfig.jiraApiPath,
          notifications: newConfig.notifications,
          use_mock_data: newConfig.useMockData
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConfig({
          jiraToken: data.config.jira_token || '',
          jiraDomain: data.config.jira_domain || '',
          jiraEmail: data.config.jira_email || '',
          jiraApiPath: data.config.jira_api_path || '/rest/api/3/search',
          notifications: data.config.notifications !== false,
          useMockData: data.config.use_mock_data === true
        })
        toast.success('Configurações salvas com sucesso!')
      } else {
        throw new Error('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações')
      throw error
    }
  }

  const refreshConfig = async () => {
    await loadConfig()
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <ConfigContext.Provider value={{ 
      config, 
      setConfig, 
      loading, 
      saveConfig, 
      refreshConfig 
    }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}