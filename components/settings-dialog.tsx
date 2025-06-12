"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useConfig } from "@/hooks/use-config"
import { toast } from "sonner"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const { config, setConfig } = useConfig()

  const [formState, setFormState] = useState({
    jiraToken: "",
    jiraDomain: "",
    jiraApiPath: "",
    notifications: true,
    useMockData: false,
  })

  useEffect(() => {
    setFormState({
      jiraToken: config.jiraToken || "",
      jiraDomain: config.jiraDomain || "",
      jiraApiPath: config.jiraApiPath || "/rest/api/3/search",
      notifications: config.notifications !== false,
      useMockData: config.useMockData === true,
    })
  }, [config, open])

  const handleSave = () => {
    setConfig({
      ...config,
      jiraToken: formState.jiraToken,
      jiraDomain: formState.jiraDomain,
      jiraApiPath: formState.jiraApiPath || "/rest/api/3/search",
      notifications: formState.notifications,
      useMockData: formState.useMockData,
    })
    toast.success("Configurações salvas com sucesso!")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Personalize sua experiência e configure as credenciais do Jira</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="geral">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="jira">API do Jira</TabsTrigger>
          </TabsList>
          <TabsContent value="geral" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Tema</Label>
                <p className="text-sm text-muted-foreground">Escolha entre tema claro ou escuro</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                  Claro
                </Button>
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                  Escuro
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificações</Label>
                <p className="text-sm text-muted-foreground">Ativar notificações do sistema</p>
              </div>
              <Switch
                id="notifications"
                checked={formState.notifications}
                onCheckedChange={(checked) => setFormState({ ...formState, notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useMockData">Usar dados de demonstração</Label>
                <p className="text-sm text-muted-foreground">Utilizar dados fictícios para demonstração</p>
              </div>
              <Switch
                id="useMockData"
                checked={formState.useMockData}
                onCheckedChange={(checked) => setFormState({ ...formState, useMockData: checked })}
              />
            </div>
          </TabsContent>
          <TabsContent value="jira" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="jira-domain">Domínio do Jira</Label>
              <Input
                id="jira-domain"
                placeholder="https://sua-empresa.atlassian.net"
                value={formState.jiraDomain}
                onChange={(e) => setFormState({ ...formState, jiraDomain: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">URL base da sua instância do Jira</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jira-api-path">Rota da API</Label>
              <Input
                id="jira-api-path"
                placeholder="/rest/api/3/search"
                value={formState.jiraApiPath}
                onChange={(e) => setFormState({ ...formState, jiraApiPath: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Caminho da API de busca do Jira</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jira-token">Token da API</Label>
              <Input
                id="jira-token"
                type="password"
                placeholder="Token de acesso à API do Jira"
                value={formState.jiraToken}
                onChange={(e) => setFormState({ ...formState, jiraToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Token de autenticação para acessar a API do Jira</p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
