'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MindMapNode as MindMapNodeType } from './native-mind-map'
import { MindMapTheme } from '@/constants/mind-map-themes'

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
  onAddChild: (parentId: string, side?: 'left' | 'right') => void
  onToggleExpansion: (nodeId: string) => void
  onTextUpdate?: (nodeId: string, text: string) => void
  editingNodeId?: string | null
  theme?: MindMapTheme
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
  onToggleExpansion,
  onTextUpdate,
  editingNodeId,
  theme
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const editableRef = useRef<HTMLDivElement>(null)
  
  // Verificar se este nó está sendo editado
  const isCurrentlyEditing = editingNodeId === node.id
  
  // useEffect para focar no elemento quando entrar em modo de edição
  useEffect(() => {
    if (isCurrentlyEditing && editableRef.current) {
      editableRef.current.focus()
      
      // Definir o conteúdo inicial para edição
      const textContent = node.text.includes('<') ? 
        editableRef.current.textContent || node.text.replace(/<[^>]*>/g, '') : 
        node.text
      editableRef.current.textContent = textContent
      
      // Selecionar todo o texto
      const range = document.createRange()
      range.selectNodeContents(editableRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isCurrentlyEditing, node.text])
  // Função para lidar com a edição de texto
  const handleTextEdit = () => {
    if (!isCurrentlyEditing) {
      setIsEditing(true)
      onNodeEdit(node.id)
    }
  }

  // Função para salvar o texto editado
  const handleTextSave = () => {
    if (editableRef.current && isCurrentlyEditing) {
      const newText = editableRef.current.textContent || ''
      onTextUpdate(node.id, newText)
      setIsEditing(false)
    }
  }

  // Função para lidar com teclas pressionadas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      if (editableRef.current) {
        const textContent = node.text.includes('<') ? 
          node.text.replace(/<[^>]*>/g, '') : 
          node.text
        editableRef.current.textContent = textContent
      }
    }
  }
  const getNodeStyle = () => {
    // Usar cores do tema se disponível, senão usar a cor do nó
    const nodeColor = theme && theme.nodeColors.length > 0 
      ? theme.nodeColors[node.level % theme.nodeColors.length] 
      : node.color

    const baseStyle = {
      fill: nodeColor,
      stroke: theme?.borderColor || '#ffffff',
      strokeWidth: 3,
      filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
      opacity: isDragging ? 0.8 : 1,
    }

    // Adicionar gradiente moderno baseado no nível com glassmorphism vibrante
    if (node.level === 0) {
      return {
        ...baseStyle,
        fill: 'url(#gradient-root)',
        strokeWidth: 4,
        filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.2)) brightness(1.2)',
      }
    } else if (node.level === 1) {
      return {
        ...baseStyle,
        fill: 'url(#gradient-level1)',
        filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15)) saturate(1.5)',
      }
    } else {
      return {
        ...baseStyle,
        fill: 'url(#gradient-default)',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) contrast(1.1)',
      }
    }
  }

  // Função para obter propriedades do texto baseado no nível
  const getTextStyle = (node: MindMapNodeType) => {
    const level = node.level || 0
    const textColor = theme?.textColor || 'white'
    
    if (node.isRoot) {
      return {
        fontSize: Math.max(20, node.fontSize || 18),
        fontWeight: '900',
        fill: textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    } else {
      const baseFontSize = node.fontSize || 14
      
      if (level === 1) {
        return {
          fontSize: Math.max(16, baseFontSize),
          fontWeight: 'bold',
          fill: textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      } else if (level === 2) {
        return {
          fontSize: Math.max(14, baseFontSize - 1),
          fontWeight: '600',
          fill: textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      } else {
        return {
          fontSize: Math.max(12, baseFontSize - 2),
          fontWeight: '500',
          fill: textColor,
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
          x: (e.clientX - rect.left - pan.x) / zoom - node.x,
          y: (e.clientY - rect.top - pan.y) / zoom - node.y
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

  const handleAddChild = (e: React.MouseEvent, side: 'left' | 'right' = 'right') => {
    e.stopPropagation()
    onAddChild(node.id, side)
  }

  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpansion(node.id)
  }

  const nodeStyle = getNodeStyle(node)
  const textStyle = getTextStyle(node)

  // Função para renderizar a forma do nó com design moderno
  const renderNodeShape = () => {
    const nodeStyle = getNodeStyle()
    
    // Usar cores do tema se disponível, senão usar a cor do nó
    const nodeColor = theme && theme.nodeColors.length > 0 
      ? theme.nodeColors[node.level % theme.nodeColors.length] 
      : node.color
    
    const rootColor = theme && theme.nodeColors.length > 0 
      ? theme.nodeColors[0] 
      : '#E91E63'

    // Cores neon vibrantes e modernas baseadas no nível com glassmorphism intenso
    const getModernColors = () => {
      const levelColors = {
        0: { // Nó raiz - azul neon vibrante
          primary: '#0066FF', // Azul neon
          secondary: '#3388FF', // Azul claro
          accent: '#66AAFF', // Azul suave
          glass: 'rgba(0, 102, 255, 0.3)',
          glow: '#0066FF'
        },
        1: { // Primeiro nível - roxo neon intenso
          primary: '#8A2BE2', // Roxo neon
          secondary: '#9932CC', // Roxo médio
          accent: '#BA55D3', // Roxo claro
          glass: 'rgba(138, 43, 226, 0.25)',
          glow: '#8A2BE2'
        },
        2: { // Segundo nível - verde neon brilhante
          primary: '#00FF7F', // Verde neon
          secondary: '#32CD32', // Verde lima
          accent: '#7FFF00', // Verde chartreuse
          glass: 'rgba(0, 255, 127, 0.25)',
          glow: '#00FF7F'
        },
        3: { // Terceiro nível - laranja neon vibrante
          primary: '#FF6600', // Laranja neon
          secondary: '#FF8C00', // Laranja escuro
          accent: '#FFA500', // Laranja
          glass: 'rgba(255, 102, 0, 0.25)',
          glow: '#FF6600'
        },
        4: { // Quarto nível - rosa neon intenso
          primary: '#FF1493', // Rosa neon
          secondary: '#FF69B4', // Rosa quente
          accent: '#FFB6C1', // Rosa claro
          glass: 'rgba(255, 20, 147, 0.25)',
          glow: '#FF1493'
        },
        5: { // Quinto nível - ciano neon
          primary: '#00FFFF', // Ciano neon
          secondary: '#40E0D0', // Turquesa
          accent: '#7FFFD4', // Aquamarine
          glass: 'rgba(0, 255, 255, 0.25)',
          glow: '#00FFFF'
        },
        6: { // Sexto nível - amarelo neon
          primary: '#FFFF00', // Amarelo neon
          secondary: '#FFD700', // Dourado
          accent: '#FFFF99', // Amarelo claro
          glass: 'rgba(255, 255, 0, 0.25)',
          glow: '#FFFF00'
        }
      }
      
      // Usar cores do tema se disponível, senão usar esquema de cores por nível
      if (theme && theme.nodeColors.length > 0) {
        const themeColor = theme.nodeColors[node.level % theme.nodeColors.length]
        return {
          primary: themeColor,
          secondary: `${themeColor}CC`,
          accent: `${themeColor}80`,
          glass: `${themeColor}40`,
          glow: `${themeColor}60`
        }
      }
      
      // Usar esquema de cores por nível ou repetir ciclicamente
      const levelColor = levelColors[node.level as keyof typeof levelColors] || 
                        levelColors[(node.level % 7) as keyof typeof levelColors]
      
      return levelColor
    }

    const colors = getModernColors()
    const nodeId = `node-${node.id}`
    
    return (
      <>
        {/* Definições avançadas para design moderno */}
        <defs>
          {/* Gradiente principal com múltiplas paradas */}
          <linearGradient id={`gradient-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.95" />
            <stop offset="50%" stopColor={colors.primary} stopOpacity="0.85" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.9" />
          </linearGradient>

          {/* Gradiente de borda com glassmorphism */}
          <linearGradient id={`border-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>

          {/* Gradiente para efeito de hover */}
          <linearGradient id={`gradient-hover-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.2" />
          </linearGradient>

          {/* Filtros modernos */}
          <filter id={`shadow-${nodeId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="0" dy="4" result="offset"/>
            <feFlood floodColor={colors.primary} floodOpacity="0.25"/>
            <feComposite in2="offset" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Filtro de hover com brilho */}
          <filter id={`glow-${nodeId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id={`inner-shadow-${nodeId}`}>
            <feOffset dx="0" dy="2"/>
            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
            <feFlood floodColor="rgba(0,0,0,0.1)"/>
            <feComposite in2="offset-blur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Padrão de ruído sutil para textura */}
          <filter id={`noise-${nodeId}`}>
            <feTurbulence baseFrequency="0.9" numOctaves="1" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0.02 0.04 0.06"/>
            </feComponentTransfer>
            <feComposite operator="over" in2="SourceGraphic"/>
          </filter>
        </defs>
        
        {/* Sombra de fundo para profundidade */}
        <rect
          x={2}
          y={6}
          width={node.width}
          height={node.height}
          rx={node.level === 0 ? 28 : 24}
          ry={node.level === 0 ? 28 : 24}
          fill={colors.primary}
          opacity="0.15"
          className="pointer-events-none"
        />

        {/* Base do nó com glassmorphism elegante */}
        <rect
           x={0}
           y={0}
           width={node.width}
           height={node.height}
           rx={node.level === 0 ? 28 : 24}
           ry={node.level === 0 ? 28 : 24}
           fill={`url(#glassmorphism-base-${nodeId})`}
           stroke={`url(#glassmorphism-border-${nodeId})`}
           strokeWidth={isSelected ? 2.5 : 1.5}
           filter={`url(#glassmorphism-filter-${nodeId})`}
           className={`cursor-pointer transition-all duration-500 ease-out hover:scale-105 ${
             isSelected ? 'drop-shadow-2xl' : 'hover:brightness-110'
           }`}
           style={{
             transformOrigin: `${node.width / 2}px ${node.height / 2}px`,
             transform: isSelected ? 'scale(1.02)' : 'scale(1)',
           }}
           onMouseDown={handleMouseDown}
           onMouseUp={handleMouseUp}
           onDoubleClick={handleDoubleClick}
         />

        {/* Camada de glassmorphism com blur */}
        <rect
          x={2}
          y={2}
          width={node.width - 4}
          height={node.height - 4}
          rx={node.level === 0 ? 26 : 22}
          ry={node.level === 0 ? 26 : 22}
          fill={`url(#glassmorphism-overlay-${nodeId})`}
          className="pointer-events-none"
          opacity="0.8"
        />

         {/* Highlight superior para efeito de vidro premium */}
         <rect
           x={3}
           y={3}
           width={node.width - 6}
           height={node.height * 0.4}
           rx={node.level === 0 ? 25 : 21}
           ry={node.level === 0 ? 25 : 21}
           fill={`url(#glass-highlight-${nodeId})`}
           className="pointer-events-none transition-opacity duration-500 ease"
         />

         {/* Reflexo lateral esquerdo */}
         <rect
           x={3}
           y={node.height * 0.2}
           width={node.width * 0.15}
           height={node.height * 0.6}
           rx={node.level === 0 ? 20 : 16}
           ry={node.level === 0 ? 20 : 16}
           fill={`url(#glass-side-highlight-${nodeId})`}
           className="pointer-events-none"
           opacity="0.6"
         />

         {/* Definições dos gradientes glassmorphism vibrantes */}
         <defs>
           {/* Base glassmorphism com cores vibrantes */}
           <linearGradient id={`glassmorphism-base-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
             <stop offset="30%" stopColor={colors.secondary} stopOpacity="0.8" />
             <stop offset="70%" stopColor={colors.accent} stopOpacity="0.7" />
             <stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
           </linearGradient>

           {/* Overlay glassmorphism intenso */}
           <radialGradient id={`glassmorphism-overlay-${nodeId}`} cx="30%" cy="30%">
             <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
             <stop offset="40%" stopColor={colors.glow} stopOpacity="0.3" />
             <stop offset="80%" stopColor={colors.primary} stopOpacity="0.2" />
             <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
           </radialGradient>

           {/* Borda glassmorphism vibrante */}
           <linearGradient id={`glassmorphism-border-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor={colors.glow} stopOpacity="0.8" />
             <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
             <stop offset="100%" stopColor={colors.primary} stopOpacity="0.7" />
           </linearGradient>

           {/* Highlight principal */}
           <linearGradient id={`glass-highlight-${nodeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
             <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
             <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
           </linearGradient>

           {/* Highlight lateral */}
           <linearGradient id={`glass-side-highlight-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
             <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
           </linearGradient>

           {/* Filtro glassmorphism com brilho intenso */}
           <filter id={`glassmorphism-filter-${nodeId}`} x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
             <feColorMatrix type="saturate" values="1.8"/>
             <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={colors.glow} floodOpacity="0.4"/>
             <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor={colors.primary} floodOpacity="0.3"/>
           </filter>
           
           {/* Gradiente de brilho neon */}
           <radialGradient id={`neon-glow-${nodeId}`} cx="50%" cy="50%" r="60%">
             <stop offset="0%" stopColor={colors.glow} stopOpacity="0.6" />
             <stop offset="70%" stopColor={colors.primary} stopOpacity="0.4" />
             <stop offset="100%" stopColor="transparent" stopOpacity="0" />
           </radialGradient>
         </defs>
      </>
    )
  }

  return (
    <g 
        className={`mind-map-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} transition-all duration-200 hover:scale-105 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
        data-node-id={node.id}
        style={{ 
          opacity: nodeStyle.opacity,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translate(${node.x}px, ${node.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          transformOrigin: 'center'
        }}
      >
      {/* Forma do nó baseada no nível */}
      {renderNodeShape()}

      {/* Indicador moderno de filhos - removido a numeração */}
      {node.children && node.children.length > 0 && (
        <g className="pointer-events-none">
          {/* Círculo indicador simples */}
          <circle
            cx={node.width - 12}
            cy={node.height - 12}
            r={4}
            fill="url(#children-indicator-bg)"
            filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))"
          />

          {/* Definição do gradiente para o indicador */}
          <defs>
            <radialGradient id="children-indicator-bg">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
            </radialGradient>
          </defs>
        </g>
      )}

      {/* Texto do nó com design moderno e melhor tipografia */}
      <foreignObject
        x={8}
        y={8}
        width={node.width - 16}
        height={node.height - 16}
        className={isCurrentlyEditing ? "pointer-events-auto" : "pointer-events-none"}
      >
        <div
          ref={editableRef}
          contentEditable={isCurrentlyEditing}
          suppressContentEditableWarning={true}
          onDoubleClick={handleTextEdit}
          onBlur={handleTextSave}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: node.level === 0 ? '16px' : node.level === 1 ? '14px' : '12px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: node.level === 0 ? '700' : node.level === 1 ? '600' : '500',
            color: theme?.textColor || '#ffffff',
            textAlign: 'center',
            overflow: 'hidden',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.3',
            letterSpacing: node.level === 0 ? '0.5px' : '0.25px',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            outline: isCurrentlyEditing ? '3px solid #3b82f6' : 'none',
            borderRadius: '8px',
            padding: node.level === 0 ? '8px' : '6px',
            cursor: isCurrentlyEditing ? 'text' : 'default',
            background: isCurrentlyEditing ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
            color: isCurrentlyEditing ? '#1f2937' : (theme?.textColor || '#ffffff'),
            backdropFilter: isCurrentlyEditing ? 'blur(10px)' : 'none',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {isCurrentlyEditing ? '' : (node.text.includes('<') ? 
            <span dangerouslySetInnerHTML={{ __html: node.text }} /> : 
            node.text
          )}
        </div>
      </foreignObject>

      {/* Botão de adicionar filho com design ultra-moderno - LADO DIREITO */}
      {isSelected && !isReadOnly && (
        <g className="add-child-button-right">
          {/* Sombra do botão */}
          <circle
            cx={node.width + 24}
            cy={node.height / 2 + 2}
            r={16}
            fill="#000000"
            opacity="0.15"
            className="pointer-events-none"
          />
          
          {/* Botão principal */}
          <circle
            cx={node.width + 24}
            cy={node.height / 2}
            r={16}
            fill="url(#gradient-add-button-right)"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={2}
            className="cursor-pointer transition-all duration-200 hover:scale-110"
            onClick={(e) => handleAddChild(e, 'right')}
            filter="drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))"
          />
          
          {/* Ícone + ultra-moderno */}
          <g className="pointer-events-none">
            <line
              x1={node.width + 18}
              y1={node.height / 2}
              x2={node.width + 30}
              y2={node.height / 2}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={node.width + 24}
              y1={node.height / 2 - 6}
              x2={node.width + 24}
              y2={node.height / 2 + 6}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
          
          {/* Gradiente aprimorado para o botão direito */}
          <defs>
            <linearGradient id="gradient-add-button-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </g>
      )}

      {/* Botão de adicionar filho com design ultra-moderno - LADO ESQUERDO */}
      {isSelected && !isReadOnly && (
        <g className="add-child-button-left">
          {/* Sombra do botão */}
          <circle
            cx={-24}
            cy={node.height / 2 + 2}
            r={16}
            fill="#000000"
            opacity="0.15"
            className="pointer-events-none"
          />
          
          {/* Botão principal */}
          <circle
            cx={-24}
            cy={node.height / 2}
            r={16}
            fill="url(#gradient-add-button-left)"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={2}
            className="cursor-pointer transition-all duration-200 hover:scale-110"
            onClick={(e) => handleAddChild(e, 'left')}
            filter="drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))"
          />
          
          {/* Ícone + ultra-moderno */}
          <g className="pointer-events-none">
            <line
              x1={-30}
              y1={node.height / 2}
              x2={-18}
              y2={node.height / 2}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={-24}
              y1={node.height / 2 - 6}
              x2={-24}
              y2={node.height / 2 + 6}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
          
          {/* Gradiente aprimorado para o botão esquerdo */}
          <defs>
            <linearGradient id="gradient-add-button-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
        </g>
      )}

      {/* Botão de expandir/colapsar ultra-modernizado */}
      {node.children && node.children.length > 0 && !isReadOnly && (
        <g className="expand-collapse-button">
          {/* Sombra do botão */}
          <circle
            cx={node.width / 2}
            cy={-22}
            r={14}
            fill="#000000"
            opacity="0.15"
            className="pointer-events-none"
          />
          
          {/* Botão principal */}
          <circle
            cx={node.width / 2}
            cy={-20}
            r={14}
            fill={node.isExpanded ? "url(#gradient-collapse)" : "url(#gradient-expand)"}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={2}
            className="cursor-pointer transition-all duration-200 hover:scale-110"
            onClick={handleToggleExpansion}
            filter={node.isExpanded ? 
              "drop-shadow(0 3px 8px rgba(239, 68, 68, 0.4))" : 
              "drop-shadow(0 3px 8px rgba(59, 130, 246, 0.4))"
            }
          />
          
          {/* Ícone modernizado com animação */}
          <g className="pointer-events-none">
            {node.isExpanded ? (
              // Ícone de menos ultra-moderno
              <line
                x1={node.width / 2 - 6}
                y1={-20}
                x2={node.width / 2 + 6}
                y2={-20}
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
                className="transition-all duration-200"
              />
            ) : (
              // Ícone de mais ultra-moderno
              <g className="transition-all duration-200">
                <line
                  x1={node.width / 2 - 6}
                  y1={-20}
                  x2={node.width / 2 + 6}
                  y2={-20}
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={node.width / 2}
                  y1={-26}
                  x2={node.width / 2}
                  y2={-14}
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
          
          {/* Gradientes aprimorados para os botões */}
          <defs>
            <linearGradient id="gradient-expand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="gradient-collapse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
        </g>
      )}
    </g>
  )
}

export default MindMapNode