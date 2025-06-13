// components/JiraConfigForm.tsx
"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useJiraConfig } from '@/contexts/JiraConfigContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const configSchema = z.object({
  jira_email: z.string().email('Email inválido'),
  jira_token: z.string().min(1, 'Token é obrigatório'),
  jira_url: z.string().url('URL inválida'),
  max_results: z.number().min(1).max(1000).default(100)
})

type ConfigFormData = z.infer<typeof configSchema>

export default function JiraConfigForm() {
  const { configuration, loading, saveConfiguration } = useJiraConfig()
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      jira_email: '',
      jira_token: '',
      jira_url: 'https://hnt.atlassian.net',
      max_results: 100
    }
  })

  useEffect(() => {
    if (configuration) {
      form.reset({
        jira_email: configuration.jira_email || '',
        jira_token: configuration.jira_token || '',
        jira_url: configuration.jira_url || 'https://hnt.atlassian.net',
        max_results: configuration.max_results || 100
      })
    }
  }, [configuration, form])

  const onSubmit = async (data: ConfigFormData) => {
    setSaving(true)
    try {
      await saveConfiguration(data)
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Configurações do Jira</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jira_email">Email do Jira</Label>
            <Input
              id="jira_email"
              type="email"
              {...form.register('jira_email')}
              placeholder="seu-email@empresa.com"
            />
            {form.formState.errors.jira_email && (
              <p className="text-sm text-red-500">
                {form.formState.errors.jira_email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jira_token">Token do Jira</Label>
            <div className="relative">
              <Input
                id="jira_token"
                type={showToken ? 'text' : 'password'}
                {...form.register('jira_token')}
                placeholder="Seu token de API"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.formState.errors.jira_token && (
              <p className="text-sm text-red-500">
                {form.formState.errors.jira_token.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Para gerar um token, acesse: Jira → Configurações → Segurança → Tokens de API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jira_url">URL do Jira</Label>
            <Input
              id="jira_url"
              {...form.register('jira_url')}
              placeholder="https://sua-empresa.atlassian.net"
            />
            {form.formState.errors.jira_url && (
              <p className="text-sm text-red-500">
                {form.formState.errors.jira_url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_results">Máximo de Resultados por Página</Label>
            <Input
              id="max_results"
              type="number"
              {...form.register('max_results', { valueAsNumber: true })}
              min={1}
              max={1000}
            />
            {form.formState.errors.max_results && (
              <p className="text-sm text-red-500">
                {form.formState.errors.max_results.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}