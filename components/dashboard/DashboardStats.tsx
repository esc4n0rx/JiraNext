// components/dashboard/DashboardStats.tsx
"use client"

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '@/contexts/DashboardContext'
import { 
  FileText, 
  AlertCircle, 
  Calendar, 
  Package, 
  Store,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  delay = 0,
  color = "blue" 
}: {
  title: string
  value: string | number
  icon: any
  description?: string
  delay?: number
  color?: string
}) => {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className={`absolute inset-0 bg-gradient-to-r ${colors[color as keyof typeof colors]} opacity-10`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">
            {title}
          </CardTitle>
          <Icon className={`h-4 w-4 text-${color}-400`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-gray-400 mt-1">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DashboardStats() {
  const { dashboardData, loading } = useDashboard()

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-300 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-gray-500">Execute uma extração para ver os dados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total de Chamados"
        value={dashboardData.totalChamados}
        icon={FileText}
        description="Logs únicos extraídos"
        delay={0}
        color="blue"
      />

      <StatCard
        title="Status Principais"
        value={dashboardData.statusChamados.length}
        icon={AlertCircle}
        description={`${dashboardData.statusChamados.reduce((acc, s) => acc + s.count, 0)} chamados`}
        delay={0.1}
        color="green"
      />

      <StatCard
        title="Chamado Mais Antigo"
        value={dashboardData.chamadoMaisAntigo?.log || "N/A"}
        icon={Calendar}
        description={dashboardData.chamadoMaisAntigo ? 
          format(new Date(dashboardData.chamadoMaisAntigo.dataCreation), 'dd/MM/yyyy', { locale: ptBR }) : 
          "Nenhum chamado"
        }
        delay={0.2}
        color="purple"
      />

      <StatCard
        title="Material Problema"
        value={dashboardData.materialMaiorDivergencia?.material.substring(0, 20) + "..." || "N/A"}
        icon={Package}
        description={dashboardData.materialMaiorDivergencia ? 
          `${dashboardData.materialMaiorDivergencia.count} ocorrências` : 
          "Nenhum material"
        }
        delay={0.3}
        color="orange"
      />

      <StatCard
        title="Loja Crítica"
        value={dashboardData.lojaMaiorAbertura?.loja || "N/A"}
        icon={Store}
        description={dashboardData.lojaMaiorAbertura ? 
          `${dashboardData.lojaMaiorAbertura.count} chamados` : 
          "Nenhuma loja"
        }
        delay={0.4}
        color="red"
      />

      <StatCard
        title="Última Atualização"
        value={format(new Date(dashboardData.lastUpdate), 'HH:mm', { locale: ptBR })}
        icon={TrendingUp}
        description={format(new Date(dashboardData.lastUpdate), 'dd/MM/yyyy', { locale: ptBR })}
        delay={0.5}
        color="indigo"
      />
    </div>
  )
}