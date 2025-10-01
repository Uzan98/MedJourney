'use client'

import React from 'react'
import { MindMapConnection as MindMapConnectionType, MindMapNode } from './native-mind-map'

interface MindMapConnectionProps {
  connection: MindMapConnectionType
  fromNode: MindMapNode
  toNode: MindMapNode
}

const MindMapConnection: React.FC<MindMapConnectionProps> = ({
  connection,
  fromNode,
  toNode
}) => {
  // Não renderizar conexões para nós colapsados
  if (!fromNode.isExpanded) return null

  // Calcular pontos de conexão nas bordas dos nós
  const fromX = fromNode.x + fromNode.width / 2
  const fromY = fromNode.y + fromNode.height / 2
  const toX = toNode.x + toNode.width / 2
  const toY = toNode.y + toNode.height / 2

  // Calcular pontos nas bordas dos retângulos
  const dx = toX - fromX
  const dy = toY - fromY
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance === 0) return null

  const fromEdgeX = fromX + (dx / distance) * (fromNode.width / 2)
  const fromEdgeY = fromY + (dy / distance) * (fromNode.height / 2)
  const toEdgeX = toX - (dx / distance) * (toNode.width / 2)
  const toEdgeY = toY - (dy / distance) * (toNode.height / 2)

  // Criar curva suave para conexões mais modernas
  const midX = (fromEdgeX + toEdgeX) / 2
  const midY = (fromEdgeY + toEdgeY) / 2
  const controlOffset = Math.min(50, distance / 4)
  
  // Calcular pontos de controle para curva Bézier
  const controlX1 = fromEdgeX + (dx / distance) * controlOffset
  const controlY1 = fromEdgeY + (dy / distance) * controlOffset
  const controlX2 = toEdgeX - (dx / distance) * controlOffset
  const controlY2 = toEdgeY - (dy / distance) * controlOffset

  const pathData = `M ${fromEdgeX} ${fromEdgeY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toEdgeX} ${toEdgeY}`

  return (
    <g>
      {/* Linha de conexão curva com gradiente */}
      <defs>
        <linearGradient id={`gradient-${connection.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={fromNode.color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={toNode.color} stopOpacity="0.8" />
        </linearGradient>
        <filter id={`glow-${connection.id}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <path
        d={pathData}
        stroke={`url(#gradient-${connection.id})`}
        strokeWidth={connection.width + 1}
        fill="none"
        className="pointer-events-none"
        filter={`url(#glow-${connection.id})`}
        opacity="0.9"
      />
      
      {/* Seta moderna na ponta */}
      <g transform={`translate(${toEdgeX}, ${toEdgeY}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}>
        <path
          d="M 0 0 L -12 -4 L -8 0 L -12 4 Z"
          fill={toNode.color}
          stroke="#ffffff"
          strokeWidth="1"
          className="pointer-events-none"
          opacity="0.9"
        />
      </g>
    </g>
  )
}

export default MindMapConnection