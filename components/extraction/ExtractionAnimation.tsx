// components/extraction/ExtractionAnimation.tsx
"use client"

import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface ExtractionAnimationProps {
  progress: number
  currentStep: string
  isExtracting: boolean
}

const BuildingBlocks = ({ progress }: { progress: number }) => {
  const blocks = Array.from({ length: 12 }, (_, i) => i)
  
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {blocks.map((block) => {
        const blockProgress = Math.max(0, Math.min(100, (progress - block * 8)))
        const isActive = blockProgress > 0
        
        return (
          <motion.div
            key={block}
            className={`h-8 rounded transition-all duration-300 ${
              isActive 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: isActive ? 1 : 0.8, 
              opacity: isActive ? 1 : 0.3,
              y: isActive ? 0 : 10
            }}
            transition={{ 
              duration: 0.5, 
              delay: block * 0.1,
              type: "spring",
              stiffness: 100
            }}
          >
            <motion.div
              className="h-full bg-white/20 rounded"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, blockProgress)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </motion.div>
        )
      })}
    </div>
  )
}

export default function ExtractionAnimation({ 
  progress, 
  currentStep, 
  isExtracting 
}: ExtractionAnimationProps) {
  if (!isExtracting) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border"
    >
      <div className="text-center mb-4">
        <motion.h3
          className="text-lg font-semibold mb-2"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Construindo sua análise...
        </motion.h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{currentStep}</p>
      </div>

      <BuildingBlocks progress={progress} />

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Progresso da Extração</span>
          <span className="font-medium">{progress.toFixed(1)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <motion.div
        className="mt-4 flex justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </motion.div>
    </motion.div>
  )
}