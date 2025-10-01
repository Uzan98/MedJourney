'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import MindMapNode from './mind-map-node'
import MindMapConnection from './mind-map-connection'
import MindMapControls from './mind-map-controls'

// Tipos e interfaces
export interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  color: string
  level: number
  parentId?: string
  isExpanded: boolean
  children: string[]
}

export interface MindMapConnection {
  id: string
  fromNodeId: string
  toNodeId: string
  color: string
  width: number
}

export interface MindMapData {
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  rootNodeId: string
}

interface NativeMindMapProps {
  data: MindMapData
  onDataChange: (data: MindMapData) => void
  className?: string
}

const NativeMindMap: React.FC<NativeMindMapProps> = ({
  data,
  onDataChange,
  className = ''
}) => {
  // Estados
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState('#3B82F6')
  const [showColorPalette, setShowColorPalette] = useState(false)

  // Estados para rich text
  const [selectedFormats, setSelectedFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: 'left' as 'left' | 'center' | 'right',
    fontSize: '16px'
  })

  // Referências
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Função para aplicar formatação ao nó em edição
  const applyFormatToEditingNode = (format: string, value?: string) => {
    if (!editingNodeId) return
    
    // Encontrar o elemento editável do nó em edição
    const editableElement = document.querySelector(`[data-node-id="${editingNodeId}"] [contenteditable="true"]`) as HTMLElement
    if (!editableElement) return
    
    // Focar no elemento se não estiver focado
    if (document.activeElement !== editableElement) {
      editableElement.focus()
    }
    
    // Aplicar formatação usando execCommand
    switch (format) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
      case 'list':
        if (value === 'bullet') {
          document.execCommand('insertUnorderedList', false)
        }
        break
      case 'align':
        if (value === 'left') {
          document.execCommand('justifyLeft', false)
        } else if (value === 'center') {
          document.execCommand('justifyCenter', false)
        } else if (value === 'right') {
          document.execCommand('justifyRight', false)
        }
        break
      case 'size':
        if (value) {
          document.execCommand('fontSize', false, value)
        }
        break
    }
  }

  // Cores predefinidas
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
  ]

  // Handlers para rich text
  const handleBold = () => {
    applyFormatToEditingNode('bold')
    setSelectedFormats(prev => ({ ...prev, bold: !prev.bold }))
  }

  const handleItalic = () => {
    applyFormatToEditingNode('italic')
    setSelectedFormats(prev => ({ ...prev, italic: !prev.italic }))
  }

  const handleUnderline = () => {
    applyFormatToEditingNode('underline')
    setSelectedFormats(prev => ({ ...prev, underline: !prev.underline }))
  }

  const handleBulletList = () => {
    applyFormatToEditingNode('list', 'bullet')
  }

  const handleAlignLeft = () => {
    applyFormatToEditingNode('align', 'left')
    setSelectedFormats(prev => ({ ...prev, align: 'left' }))
  }

  const handleAlignCenter = () => {
    applyFormatToEditingNode('align', 'center')
    setSelectedFormats(prev => ({ ...prev, align: 'center' }))
  }

  const handleAlignRight = () => {
    applyFormatToEditingNode('align', 'right')
    setSelectedFormats(prev => ({ ...prev, align: 'right' }))
  }

  const handleFontSize = (size: string) => {
    applyFormatToEditingNode('size', size)
    setSelectedFormats(prev => ({ ...prev, fontSize: size }))
  }

  // Funções auxiliares
  const generateId = () => Math.random().toString(36).substr(2, 9)

  const calculateTextDimensions = (text: string): { width: number; height: number } => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return { width: 100, height: 30 }
    
    context.font = '14px Arial'
    const metrics = context.measureText(text)
    return {
      width: Math.max(metrics.width + 20, 80),
      height: 30
    }
  }

  const updateData = useCallback((newData: MindMapData) => {
    onDataChange(newData)
  }, [onDataChange])

  const calculateNodeLevel = (nodeId: string, nodes: MindMapNode[]): number => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !node.parentId) return 0
    return calculateNodeLevel(node.parentId, nodes) + 1
  }

  const getSiblings = (nodeId: string, nodes: MindMapNode[]): MindMapNode[] => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !node.parentId) return []
    return nodes.filter(n => n.parentId === node.parentId && n.id !== nodeId)
  }

  const updateHierarchy = (nodes: MindMapNode[]): MindMapNode[] => {
    return nodes.map(node => ({
      ...node,
      level: calculateNodeLevel(node.id, nodes)
    }))
  }

  const organizeNodesAutomatically = () => {
    const newNodes = [...data.nodes]
    const rootNode = newNodes.find(n => n.id === data.rootNodeId)
    if (!rootNode) return

    // Posicionar nó raiz no centro
    rootNode.x = 400
    rootNode.y = 300

    // Organizar nós por nível
    const nodesByLevel: { [level: number]: MindMapNode[] } = {}
    newNodes.forEach(node => {
      const level = calculateNodeLevel(node.id, newNodes)
      if (!nodesByLevel[level]) nodesByLevel[level] = []
      nodesByLevel[level].push(node)
    })

    // Posicionar nós de cada nível
    Object.keys(nodesByLevel).forEach(levelStr => {
      const level = parseInt(levelStr)
      if (level === 0) return // Pular nó raiz

      const levelNodes = nodesByLevel[level]
      const angleStep = (2 * Math.PI) / levelNodes.length
      const radius = 150 * level

      levelNodes.forEach((node, index) => {
        const angle = index * angleStep
        node.x = rootNode.x + Math.cos(angle) * radius
        node.y = rootNode.y + Math.sin(angle) * radius
      })
    })

    updateData({ ...data, nodes: newNodes })
  }

  // Handlers de eventos
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && selectedNodeId) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const svgX = (e.clientX - rect.left - panOffset.x) / zoom
        const svgY = (e.clientY - rect.top - panOffset.y) / zoom
        
        const newNodes = data.nodes.map(node => {
          if (node.id === selectedNodeId) {
            return {
              ...node,
              x: svgX - dragOffset.x,
              y: svgY - dragOffset.y
            }
          }
          return node
        })
        updateData({ ...data, nodes: newNodes })
      }
    } else if (isPanning) {
      setPanOffset({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }, [isDragging, selectedNodeId, isPanning, dragOffset, data, updateData, zoom, panOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsPanning(false)
  }, [])

  const handleNodeDragStart = (nodeId: string, offset: { x: number; y: number }) => {
    setSelectedNodeId(nodeId)
    setIsDragging(true)
    setDragOffset(offset)
  }

  const handleNodeDoubleClick = (nodeId: string) => {
    setEditingNodeId(nodeId)
  }

  const handleAddChild = (parentId: string) => {
    const parentNode = data.nodes.find(n => n.id === parentId)
    if (!parentNode) return

    const newNodeId = generateId()
    const dimensions = calculateTextDimensions('Novo Nó')
    
    const newNode: MindMapNode = {
      id: newNodeId,
      text: 'Novo Nó',
      x: parentNode.x + 150,
      y: parentNode.y + 50,
      width: dimensions.width,
      height: dimensions.height,
      color: selectedColor,
      level: parentNode.level + 1,
      parentId: parentId,
      isExpanded: true,
      children: []
    }

    const newConnection: MindMapConnection = {
      id: generateId(),
      fromNodeId: parentId,
      toNodeId: newNodeId,
      color: '#666666',
      width: 2
    }

    const updatedParent = {
      ...parentNode,
      children: [...parentNode.children, newNodeId],
      isExpanded: true
    }

    const newNodes = data.nodes.map(n => n.id === parentId ? updatedParent : n)
    newNodes.push(newNode)

    updateData({
      ...data,
      nodes: updateHierarchy(newNodes),
      connections: [...data.connections, newConnection]
    })
  }

  const handleToggleExpansion = (nodeId: string) => {
    const newNodes = data.nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, isExpanded: !node.isExpanded }
      }
      return node
    })
    updateData({ ...data, nodes: newNodes })
  }

  const handleAddNode = () => {
    if (!selectedNodeId) return
    handleAddChild(selectedNodeId)
  }

  const handleDeleteNode = () => {
    if (!selectedNodeId || selectedNodeId === data.rootNodeId) return

    const nodeToDelete = data.nodes.find(n => n.id === selectedNodeId)
    if (!nodeToDelete) return

    // Remover nó e suas conexões
    const newNodes = data.nodes.filter(n => n.id !== selectedNodeId)
    const newConnections = data.connections.filter(
      c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
    )

    // Atualizar nó pai
    if (nodeToDelete.parentId) {
      const parentNode = newNodes.find(n => n.id === nodeToDelete.parentId)
      if (parentNode) {
        parentNode.children = parentNode.children.filter(id => id !== selectedNodeId)
      }
    }

    updateData({
      ...data,
      nodes: newNodes,
      connections: newConnections
    })
    setSelectedNodeId(null)
  }

  const handleUpdateNodeText = (nodeId: string, newText: string) => {
    const dimensions = calculateTextDimensions(newText)
    const newNodes = data.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          text: newText,
          width: dimensions.width,
          height: dimensions.height
        }
      }
      return node
    })
    updateData({ ...data, nodes: newNodes })
  }

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mindmap.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportSVG = () => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mindmap.svg'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = () => {
    const shareData = {
      title: 'Mapa Mental',
      text: 'Confira este mapa mental!',
      url: window.location.href
    }
    
    if (navigator.share) {
      navigator.share(shareData)
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado para a área de transferência!')
    }
  }

  const handleCenterRoot = () => {
    const rootNode = data.nodes.find(n => n.id === data.rootNodeId)
    if (!rootNode || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const centerX = containerRect.width / 2
    const centerY = containerRect.height / 2

    setPanOffset({
      x: centerX - rootNode.x * zoom,
      y: centerY - rootNode.y * zoom
    })
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setShowColorPalette(false)
    
    if (selectedNodeId) {
      const newNodes = data.nodes.map(node => {
        if (node.id === selectedNodeId) {
          return { ...node, color }
        }
        return node
      })
      updateData({ ...data, nodes: newNodes })
    }
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3) // Máximo de 3x zoom
    setZoom(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.3) // Mínimo de 0.3x zoom
    setZoom(newZoom)
  }

  // Função para zoom com mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calcular posição do mouse no espaço do SVG antes do zoom
    const svgMouseX = (mouseX - panOffset.x) / zoom
    const svgMouseY = (mouseY - panOffset.y) / zoom
    
    // Determinar direção do zoom
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 3)
    
    // Calcular novo pan offset para manter o mouse na mesma posição
    const newPanX = mouseX - svgMouseX * newZoom
    const newPanY = mouseY - svgMouseY * newZoom
    
    setZoom(newZoom)
    setPanOffset({ x: newPanX, y: newPanY })
  }, [zoom, panOffset])

  // Função para iniciar pan com mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Verificar se o clique foi no SVG (não em um nó)
    if (e.target === svgRef.current || (e.target as Element).closest('svg') === svgRef.current) {
      setIsPanning(true)
      setDragOffset({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      })
    }
  }, [panOffset])

  // Event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e)
    }
    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    if (isDragging || isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, isPanning, handleMouseMove, handleMouseUp])

  // Função para calcular o viewBox baseado nos nós
  const calculateViewBox = useCallback(() => {
    if (data.nodes.length === 0) {
      return '0 0 800 600' // viewBox padrão se não houver nós
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    // Encontrar os limites de todos os nós
    data.nodes.forEach(node => {
      const nodeMinX = node.x
      const nodeMinY = node.y
      const nodeMaxX = node.x + node.width
      const nodeMaxY = node.y + node.height

      minX = Math.min(minX, nodeMinX)
      minY = Math.min(minY, nodeMinY)
      maxX = Math.max(maxX, nodeMaxX)
      maxY = Math.max(maxY, nodeMaxY)
    })

    // Adicionar padding ao redor dos nós
    const padding = 100
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const width = maxX - minX
    const height = maxY - minY

    return `${minX} ${minY} ${width} ${height}`
  }, [data.nodes])

  // Converter coordenadas do SVG para coordenadas da tela
  const convertSVGToScreenCoordinates = useCallback((svgX: number, svgY: number) => {
    if (!svgRef.current || !containerRef.current) return { x: svgX, y: svgY }

    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Aplicar as transformações de zoom e pan
    const transformedX = (svgX * zoom) + panOffset.x
    const transformedY = (svgY * zoom) + panOffset.y
    
    // Converter para coordenadas absolutas da tela
    const screenX = transformedX + containerRect.left
    const screenY = transformedY + containerRect.top
    
    return { x: screenX, y: screenY }
  }, [zoom, panOffset])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Render
  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-gray-50 pt-20 ${className}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setIsPanning(true)
          setDragOffset({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
        }
      }}
    >
      {/* Controles */}
      <MindMapControls
        onAddNode={handleAddNode}
        onDeleteNode={handleDeleteNode}
        onAutoOrganize={organizeNodesAutomatically}
        onExportJSON={handleExportJSON}
        onExportSVG={handleExportSVG}
        onShare={handleShare}
        onCenterRoot={handleCenterRoot}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onColorSelect={handleColorSelect}
        selectedColor={selectedColor}
        colors={colors}
        showColorPalette={showColorPalette}
        onToggleColorPalette={() => setShowColorPalette(!showColorPalette)}
        // Rich text props
        onBold={handleBold}
        onItalic={handleItalic}
        onUnderline={handleUnderline}
        onBulletList={handleBulletList}
        onAlignLeft={handleAlignLeft}
        onAlignCenter={handleAlignCenter}
        onAlignRight={handleAlignRight}
        onFontSize={handleFontSize}
        selectedFormats={selectedFormats}
      />

      {/* Canvas SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={calculateViewBox()}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Renderizar conexões */}
        {data.connections.map(connection => {
          const fromNode = data.nodes.find(n => n.id === connection.fromNodeId)
          const toNode = data.nodes.find(n => n.id === connection.toNodeId)
          
          if (!fromNode || !toNode) return null
          
          return (
            <MindMapConnection
              key={connection.id}
              connection={connection}
              fromNode={fromNode}
              toNode={toNode}
            />
          )
        })}

        {/* Renderizar nós */}
        {data.nodes
          .filter(node => {
            if (node.id === data.rootNodeId) return true
            const parentNode = data.nodes.find(n => n.id === node.parentId)
            return parentNode ? parentNode.isExpanded : true
          })
          .map(node => (
            <MindMapNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isReadOnly={false}
              zoom={zoom}
              pan={panOffset}
              svgRef={svgRef}
              onNodeSelect={setSelectedNodeId}
              onNodeDrag={handleNodeDragStart}
              onNodeEdit={setEditingNodeId}
              onAddChild={handleAddChild}
              onToggleExpansion={handleToggleExpansion}
              onTextUpdate={handleUpdateNodeText}
              editingNodeId={editingNodeId}
            />
          ))}
      </svg>
    </div>
  )
}

export default NativeMindMap