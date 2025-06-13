// components/extraction/ExtractionAnimation.tsx
"use client"

import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface ExtractionAnimationProps {
  progress: number
  currentStep: string
  isExtracting: boolean
}

const DataWave = ({ delay, amplitude }: { delay: number; amplitude: number }) => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 opacity-60"
    animate={{
      x: ['-100%', '100%'],
      scaleY: [1, amplitude, 1],
    }}
    transition={{
      x: { duration: 2, repeat: Infinity, ease: "linear", delay },
      scaleY: { duration: 1, repeat: Infinity, ease: "easeInOut", delay: delay * 0.5 }
    }}
  />
)

const FloatingData = ({ index, progress }: { index: number; progress: number }) => {
  const isActive = progress > (index * 3)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ 
        opacity: isActive ? [0, 1, 0.8, 1] : 0,
        scale: isActive ? [0, 1.2, 1] : 0,
        y: isActive ? [20, -10, 0] : 20
      }}
      transition={{
        duration: 1.5,
        delay: index * 0.2,
        repeat: isActive ? Infinity : 0,
        repeatDelay: 2
      }}
      className="absolute"
      style={{
        left: `${(index * 47) % 100}%`,
        top: `${20 + (index * 23) % 40}%`,
      }}
    >
      <div className={`
        w-3 h-3 rounded-full 
        ${index % 3 === 0 ? 'bg-blue-400' : 
          index % 3 === 1 ? 'bg-purple-400' : 'bg-green-400'}
        shadow-lg
      `} />
    </motion.div>
  )
}

const PulsingCircle = ({ size, delay, color }: { size: number; delay: number; color: string }) => (
  <motion.div
    className={`absolute top-1/2 left-1/2 rounded-full ${color} opacity-20`}
    style={{
      width: size,
      height: size,
      marginLeft: -size/2,
      marginTop: -size/2,
    }}
    animate={{
      scale: [0.8, 1.2, 0.8],
      opacity: [0.1, 0.3, 0.1],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }}
  />
)

export default function ExtractionAnimation({ 
  progress, 
  currentStep, 
  isExtracting 
}: ExtractionAnimationProps) {
  if (!isExtracting) return null

  const dataPoints = Array.from({ length: 12 }, (_, i) => i)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border shadow-xl overflow-hidden"
    >
      <div className="text-center mb-6">
        <motion.h3
          className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Processando dados...
        </motion.h3>
        <motion.p 
          className="text-gray-600 dark:text-gray-400"
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep}
        </motion.p>
      </div>

      {/* Container da animação */}
      <div className="relative h-32 mb-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Círculos pulsantes de fundo */}
        <PulsingCircle size={80} delay={0} color="bg-blue-500" />
        <PulsingCircle size={120} delay={1} color="bg-purple-500" />
        <PulsingCircle size={160} delay={2} color="bg-green-500" />
        
        {/* Ondas de dados */}
        <DataWave delay={0} amplitude={1.5} />
        <DataWave delay={0.7} amplitude={2} />
        <DataWave delay={1.4} amplitude={1.2} />
        
        {/* Pontos de dados flutuantes */}
        {dataPoints.map((point) => (
          <FloatingData key={point} index={point} progress={progress} />
        ))}
        
        {/* Barra de progresso sobreposta */}
        <motion.div
          className="absolute bottom-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Informações de progresso */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm font-medium">
          <span>Extração em andamento</span>
          <motion.span 
            className="text-blue-600 tabular-nums"
            key={progress}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {progress.toFixed(1)}%
          </motion.span>
        </div>
        <Progress value={progress} className="h-2" />
        
        <motion.div
          className="flex justify-center items-center space-x-4 text-xs text-gray-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center space-x-1">
            <motion.div 
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <span>Jira API</span>
          </div>
          <div className="flex items-center space-x-1">
            <motion.div 
              className="w-2 h-2 bg-purple-500 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            />
            <span>Processamento</span>
          </div>
          <div className="flex items-center space-x-1">
            <motion.div 
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
            />
            <span>Banco de dados</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}