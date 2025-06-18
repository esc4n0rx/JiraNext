// components/extraction/JiraExtractorContainer.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileWarning, FileSearch, FileCheck, FileX, FileCode } from 'lucide-react';
import JiraExtractorNew from './JiraExtractorNew';
import { JqlExtractionTab } from './JqlExtractionTab';

export default function JiraExtractorContainer() {
  const tabs = [
    {
      value: "divergencias",
      label: "Divergências",
      icon: FileWarning,
      component: <JiraExtractorNew />,
    },
    {
      value: "avarias",
      label: "Avarias",
      icon: FileX,
      component: (
        <JqlExtractionTab
          title="Extração de Avarias"
          description="Busca por chamados de avarias, geralmente identificados por um componente específico."
          defaultJql='project = LOG AND "Request Type" = "Informar avaria na entrega - Central de Produção" AND "Centro de Distribuição - Central de Produção" = RJ ORDER BY created DESC, priority DESC'
          extractionUrl="/api/jira/avarias/extract"
        />
      ),
    },
    {
      value: "qualidade",
      label: "Qualidade",
      icon: FileCheck,
      component: (
        <JqlExtractionTab
          title="Extração de Qualidade"
          description="Busca por chamados relacionados à qualidade do produto, normalmente usando labels específicas."
          defaultJql='project = LOG AND "Request Type" = "Qualidade (LOG)" AND "Centro de Distribuição - Central de Produção" = RJ ORDER BY priority ASC, "Tempo de resolução" ASC'
          extractionUrl="/api/jira/qualidade/extract"
        />
      ),
    },
    {
      value: "devolucoes",
      label: "Devoluções",
      icon: FileSearch,
      component: (
        <JqlExtractionTab
          title="Extração de Devoluções"
          description="Busca por chamados de devolução, que podem ser um tipo de issue específico."
          defaultJql='project = LOG AND "Request Type" = "Devolução aos CDs por avarias de validade" AND "Centro de distribuição de destino (CD)" = "CD Pavuna RJ (CD03)" ORDER BY priority ASC, "Tempo de resolução" ASC'
          extractionUrl="/api/jira/devolucoes/extract"
        />
      ),
    },
    {
      value: "personalizado",
      label: "JQL Personalizado",
      icon: FileCode,
      component: (
        <JqlExtractionTab
          title="Extração com JQL Personalizado"
          description="Escreva sua própria consulta JQL para extrair os dados que você precisa."
          defaultJql='project = "LOG" AND status = "Aberto" ORDER BY created DESC'
          isJqlEditable={true}
          extractionUrl="/api/jira/custom/extract" // URL futura
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            Extrair Dados do Jira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="divergencias" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="flex-col sm:flex-row h-12">
                  <Icon className="h-4 w-4 mr-0 mb-1 sm:mr-2 sm:mb-0" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(({ value, component }) => (
              <TabsContent key={value} value={value} className="mt-6">
                {component}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}