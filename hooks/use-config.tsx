"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Config = {
  jiraToken: string
  jiraDomain: string
  jiraApiPath: string
  notifications: boolean
  useMockData: boolean
}

type ConfigContextType = {
  config: Config
  setConfig: (config: Config) => void
}

const defaultConfig: Config = {
  jiraToken: "",
  jiraDomain: "",
  jiraApiPath: "/rest/api/3/search",
  notifications: true,
  useMockData: true, // Habilitado por padrão para facilitar demonstração
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  setConfig: () => {},
})

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Carregar configurações do localStorage
    const savedConfig = localStorage.getItem("jira-extractor-config")
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig))
      } catch (error) {
        console.error("Erro ao carregar configurações:", error)
      }
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    // Salvar configurações no localStorage quando mudarem
    if (loaded) {
      localStorage.setItem("jira-extractor-config", JSON.stringify(config))
    }
  }, [config, loaded])

  return <ConfigContext.Provider value={{ config, setConfig }}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  return useContext(ConfigContext)
}
