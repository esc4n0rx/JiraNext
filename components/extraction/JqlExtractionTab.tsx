// components/extraction/JqlExtractionTab.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '../ui/progress';
import { useConfig } from '@/hooks/use-config';
import { toast } from 'sonner';

interface JqlExtractionTabProps {
  title: string;
  description: string;
  defaultJql: string;
  isJqlEditable?: boolean;
  extractionUrl: string; // Nova prop
}

export function JqlExtractionTab({
  title,
  description,
  defaultJql,
  isJqlEditable = false,
  extractionUrl, // Nova prop
}: JqlExtractionTabProps) {
  const { config } = useConfig();
  const [jql, setJql] = useState(defaultJql);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!config.jiraDomain || !config.jiraToken || !config.jiraEmail) {
      toast.error('Configure suas credenciais do Jira primeiro.');
      return;
    }

    setIsExtracting(true);
    setProgress(0);
    setStep('Iniciando...');
    setDownloadUrl(null);
    
    try {
        const response = await fetch(extractionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configuration: config, jql: isJqlEditable ? jql : defaultJql }),
        });

        if (!response.ok || !response.body) throw new Error('Falha na resposta do servidor.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    if (data.type === 'progress') {
                        setProgress(data.progress);
                        setStep(data.step);
                    } else if (data.type === 'complete') {
                        setDownloadUrl(data.downloadUrl);
                        toast.success('Extração concluída!');
                        break;
                    } else if (data.type === 'error') {
                        throw new Error(data.message);
                    }
                }
            }
        }
    } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro desconhecido na extração.');
    } finally {
        setIsExtracting(false);
        setProgress(100);
    }
  };

  const handleDownload = () => {
      if(downloadUrl) {
          window.open(downloadUrl, '_blank');
      }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={`jql-${title}`}>Consulta JQL</Label>
          <Textarea
            id={`jql-${title}`}
            value={jql}
            onChange={(e) => isJqlEditable && setJql(e.target.value)}
            readOnly={!isJqlEditable}
            className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
            rows={4}
          />
        </div>

        {isExtracting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs font-mono">{progress.toFixed(0)}%</p>
          </motion.div>
        )}

        {!isExtracting && !downloadUrl && (
          <Button onClick={handleExtract} disabled={isExtracting} className="w-full h-11">
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Iniciar Extração
          </Button>
        )}
        
        {downloadUrl && !isExtracting &&
            <Button onClick={handleDownload} className="w-full h-11 bg-green-600 hover:bg-green-700">
                <Download className="mr-2 h-4 w-4" />
                Baixar Relatório
            </Button>
        }
      </CardContent>
    </Card>
  );
}