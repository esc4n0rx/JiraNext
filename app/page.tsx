// app/page.tsx
"use client"

import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardProvider } from '@/contexts/DashboardContext'
import DashboardStats from '@/components/dashboard/DashboardStats'
import StatusChart from '@/components/dashboard/StatusChart'
import JiraExtractorNew from '@/components/extraction/JiraExtractorNew'
import NotificationPermissionRequest from '@/components/notifications/NotificationPermissionRequest'
import ReportsSection from '@/components/reports/ReportsSection'
import SettingsPanel from '@/components/settings/SettingsPanel'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { 
  BarChart3, 
  Download, 
  FileText, 
  Settings,
  Zap
} from 'lucide-react'

const TabTriggerWithIcon = ({ value, icon: Icon, children }: {
  value: string
  icon: any
  children: React.ReactNode
}) => (
  <TabsTrigger 
    value={value} 
    className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
  >
    <Icon className="h-4 w-4" />
    <span>{children}</span>
  </TabsTrigger>
)

export default function HomePage() {
  useServiceWorker()
  return (
    <DashboardProvider>
      <NotificationPermissionRequest />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-4"
              >
                <Zap className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Jira Analytics Pro
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Plataforma inteligente para análise e extração de dados do Jira
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 h-12 bg-white dark:bg-gray-800 shadow-lg">
                <TabTriggerWithIcon value="dashboard" icon={BarChart3}>
                  Dashboard
                </TabTriggerWithIcon>
                <TabTriggerWithIcon value="extract" icon={Download}>
                  Extrair Dados
                </TabTriggerWithIcon>

                <TabTriggerWithIcon value="reports" icon={FileText}>
                  Relatórios
                </TabTriggerWithIcon>
                <TabTriggerWithIcon value="settings" icon={Settings}>
                  Configurações
                </TabTriggerWithIcon>
              </TabsList>

              {/* <TabsContent value="extract" className="space-y-6">
                <div className="flex justify-center">
                  <JiraExtractorNew />
                </div>
              </TabsContent> */}

              <TabsContent value="dashboard" className="space-y-6">
                <DashboardStats />
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <StatusChart />
                  </div>
                  <div>
                    {/* Placeholder para gráficos adicionais */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700 flex items-center justify-center"
                    >
                      <div className="text-center p-8">
                        <BarChart3 className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Mais gráficos em breve
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="extract">
                <div className="flex justify-center">
                  <JiraExtractorNew />
                </div>
              </TabsContent>

              <TabsContent value="reports">
                <ReportsSection />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsPanel />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </DashboardProvider>
  )
}