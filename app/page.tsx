// app/page.tsx
"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import JiraConfigForm from '@/components/JiraConfigForm'
import JiraExtractor from '@/components/JiraExtractor'
import JiraHistory from '@/components/JiraHistory'
import { Settings, Download, History } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Extrator de Dados do Jira
          </h1>
          <p className="text-gray-400">
            Extraia e processe dados do Jira de forma automatizada
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
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
  )
}