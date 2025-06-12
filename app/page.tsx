// app/jira/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { JiraConfigProvider } from '@/contexts/JiraConfigContext'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import JiraConfigForm from '@/components/JiraConfigForm'
import JiraExtractor from '@/components/JiraExtractor'
import JiraHistory from '@/components/JiraHistory'
import { Settings, Download, History, ArrowLeft } from 'lucide-react'

export default function JiraPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  return (
    <JiraConfigProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold text-white">
                Extrator de Dados do Jira
              </h1>
            </motion.div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
                <TabsTrigger 
                  value="extract" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Extrair Dados
                </TabsTrigger>
                <TabsTrigger 
                  value="config"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="extract" className="mt-6">
                <div className="flex justify-center">
                  <JiraExtractor />
                </div>
              </TabsContent>

              <TabsContent value="config" className="mt-6">
                <div className="flex justify-center">
                  <JiraConfigForm />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <JiraHistory />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </JiraConfigProvider>
  )
}