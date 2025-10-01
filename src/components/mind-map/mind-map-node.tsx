'use client'

import React, { useState } from 'react'
import { MindMapNode as MindMapNodeType } from './native-mind-map'

interface MindMapNodeProps {
  node: MindMapNodeType
  isSelected: boolean
  isReadOnly: boolean
  zoom: number
  pan: { x: number; y: number }
  svgRef: React.RefObject<SVGSVGElement>
  onNodeSelect: (nodeId: string) => void
  onNodeDrag: (nodeId: string, offset: { x: number; y: number }) => void
  onNodeEdit: (nodeId: string) => void
  onAddChild: (parentId: string) => void
  onToggleExpansion: (nodeId: string) => void
}

const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  isSelected,
  isReadOnly,
  zoom,
  pan,
  svgRef,
  onNodeSelect,
  onNodeDrag,
  onNodeEdit,
  onAddChild,
  onToggleExpansion
}) => {
  const [isDragging, setIsDragging] = useState(false)
  
  // Função para obter estilo do nó baseado no nível
  const getNodeStyle = () => {
    const baseStyle = {
      fill: node.color,
      stroke: '#ffffff',
      strokeWidth: 3,
      filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
      opacity: isDragging ? 0.8 : 1,
    }

    // Adicionar gradiente moderno baseado no nível
    if (node.level === 0) {
      return {
        ...baseStyle,
        fill: 'url(#gradient-root)',
        strokeWidth: 4,
        filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.2))',
      }
    } else if (node.level === 1) {
      return {
        ...baseStyle,
        fill: 'url(#gradient-level1)',
        filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15))',
      }
    } else {
      return {
        ...baseStyle,
        fill: 'url(#gradient-default)',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
      }
    }
  }

  // Função para obter propriedades do texto baseado no nível
  const getTextStyle = (node: MindMapNodeType) => {
    const level = node.level || 0
    
    if (node.isRoot) {
      return {
        fontSize: Math.max(20, node.fontSize || 18),
        fontWeight: '900',
        fill: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    } else {
      const baseFontSize = node.fontSize || 14
      
      if (level === 1) {
        return {
          fontSize: Math.max(16, baseFontSize),
          fontWeight: 'bold',
          fill: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      } else if (level === 2) {
        return {
          fontSize: Math.max(14, baseFontSize - 1),
          fontWeight: '600',
          fill: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      } else {
        return {
          fontSize: Math.max(12, baseFontSize - 2),
          fontWeight: '500',
          fill: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isReadOnly) {
      setIsDragging(true)
      onNodeSelect(node.id)
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const offset = {
          x: (e.clientX - rect.left) / zoom - pan.x - node.x,
          y: (e.clientY - rect.top) / zoom - pan.y - node.y
        }
        onNodeDrag(node.id, offset)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isReadOnly) {
      onNodeEdit(node.id)
    }
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddChild(node.id)
  }

  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpansion(node.id)
  }

  const nodeStyle = getNodeStyle(node)
  const textStyle = getTextStyle(node)

  // Função para renderizar a forma do nó
  const renderNodeShape = () => {
    const nodeStyle = getNodeStyle()
    
    return (
      <>
        {/* Definições de gradientes modernos */}
        <defs>
          <linearGradient id="gradient-root" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E91E63" />
            <stop offset="100%" stopColor="#C2185B" />
          </linearGradient>
          <linearGradient id="gradient-level1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={node.color} />
            <stop offset="100%" stopColor={node.color} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="gradient-default" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={node.color} />
            <stop offset="100%" stopColor={node.color} stopOpacity="0.7" />
          </linearGradient>
          
          {/* Filtro de brilho para hover */}
          <filter id="brightness">
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="1"/>
            </feComponentTransfer>
          </filter>
        </defs>
        
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.level === 0 ? 25 : 20}
          ry={node.level === 0 ? 25 : 20}
          fill={nodeStyle.fill}
          stroke={nodeStyle.stroke}
          strokeWidth={nodeStyle.strokeWidth}
          filter={nodeStyle.filter}
          opacity={nodeStyle.opacity}
          className={`cursor-pointer ${
            isSelected ? '' : ''
          }`}
          style={{
            transformOrigin: `${node.x + node.width / 2}px ${node.y + node.height / 2}px`,
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </>
    )
  }

  return (
    <g style={{ opacity: nodeStyle.opacity }}>
      {/* Forma do nó baseada no nível */}
      {renderNodeShape()}

      {/* Indicador moderno de filhos - pequeno ponto colorido */}
      {node.children && node.children.length > 0 && (
        <circle
          cx={node.x + node.width - 8}
          cy={node.y + node.height - 8}
          r={4}
          fill="#ffffff"
          stroke={nodeStyle.fill}
          strokeWidth={2}
          className="pointer-events-none opacity-80"
        />
      )}

      {/* Texto do nó com estilo baseado no nível */}
      <text
        x={node.x + node.width / 2}
        y={node.y + node.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textStyle.fill}
        fontSize={textStyle.fontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={textStyle.fontWeight}
        className="pointer-events-none select-none"
      >
        {node.text}
      </text>

      {/* Botão de adicionar filho com design moderno */}
      {isSelected && !isReadOnly && (
        <>
          <circle
            cx={node.x + node.width + 20}
            cy={node.y + node.height / 2}
            r={14}
            fill="url(#gradient-add-button)"
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-pointer"
            onClick={handleAddChild}
            filter="drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))"
          />
          
          {/* Ícone + moderno no botão de adicionar */}
          <g className="pointer-events-none">
            <line
              x1={node.x + node.width + 14}
              y1={node.y + node.height / 2}
              x2={node.x + node.width + 26}
              y2={node.y + node.height / 2}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={node.x + node.width + 20}
              y1={node.y + node.height / 2 - 6}
              x2={node.x + node.width + 20}
              y2={node.y + node.height / 2 + 6}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
          
          {/* Gradiente para o botão de adicionar */}
          <defs>
            <linearGradient id="gradient-add-button" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </>
      )}

      {/* Botão de expandir/colapsar modernizado */}
      {node.children && node.children.length > 0 && !isReadOnly && (
        <>
          <circle
            cx={node.x - 18}
            cy={node.y + node.height / 2}
            r={12}
            fill={node.isExpanded ? "url(#gradient-collapse)" : "url(#gradient-expand)"}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-pointer"
            onClick={handleToggleExpansion}
            filter="drop-shadow(0 3px 6px rgba(0, 0, 0, 0.15))"
          />
          
          {/* Ícone do botão modernizado */}
          <g className="pointer-events-none">
            {node.isExpanded ? (
              // Ícone de menos moderno
              <line
                x1={node.x - 24}
                y1={node.y + node.height / 2}
                x2={node.x - 12}
                y2={node.y + node.height / 2}
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ) : (
              // Ícone de mais moderno
              <>
                <line
                  x1={node.x - 24}
                  y1={node.y + node.height / 2}
                  x2={node.x - 12}
                  y2={node.y + node.height / 2}
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={node.x - 18}
                  y1={node.y + node.height / 2 - 6}
                  x2={node.x - 18}
                  y2={node.y + node.height / 2 + 6}
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
          
          {/* Gradientes para os botões de expandir/colapsar */}
          <defs>
            <linearGradient id="gradient-expand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="gradient-collapse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
        </>
      )}
    </g>
  )
}

export default MindMapNode