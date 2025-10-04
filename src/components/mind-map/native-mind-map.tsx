'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import html2canvas from 'html2canvas'
import MindMapNode from './mind-map-node'
import MindMapConnection from './mind-map-connection'
import MindMapControls from './mind-map-controls'
import MiniMap from './mini-map'
import { MindMapTheme, mindMapThemes, getThemeById, getDefaultTheme } from '@/constants/mind-map-themes'

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
  side?: 'left' | 'right' // Propriedade para definir o lado do nó
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
  
  // Estados para temas
  const [selectedTheme, setSelectedTheme] = useState<MindMapTheme>(getDefaultTheme())
  const [showThemeSelector, setShowThemeSelector] = useState(false)

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

  // useEffect para organizar automaticamente quando dados são carregados
  useEffect(() => {
    // Organizar automaticamente quando há nós e eles não estão organizados
    if (data.nodes.length > 1) {
      // Verificar se os nós precisam ser organizados (se não estão em posições organizadas)
      const rootNode = data.nodes.find(n => n.id === data.rootNodeId)
      if (rootNode) {
        const childNodes = data.nodes.filter(node => node.parentId === data.rootNodeId)
        
        // Se há nós filhos e eles não estão organizados simetricamente
        if (childNodes.length > 0) {
          const needsOrganization = childNodes.some(node => 
            Math.abs(node.x - rootNode.x) < 200 || // Muito próximo do centro
            !node.side // Não tem propriedade side definida
          )
          
          if (needsOrganization) {
            // Usar setTimeout para evitar loops infinitos
            setTimeout(() => {
              organizeNodesAutomatically()
            }, 100)
          }
        }
      }
    }
  }, [data.nodes.length, data.rootNodeId]) // Executar quando o número de nós ou rootNodeId mudar

  // useEffect para detectar cliques fora da área de edição
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingNodeId) {
        const target = event.target as HTMLElement
        
        // Verificar se o clique foi fora da área de edição
        const editableElement = document.querySelector(`[data-node-id="${editingNodeId}"] [contenteditable="true"]`) as HTMLElement
        const nodeElement = document.querySelector(`[data-node-id="${editingNodeId}"]`) as HTMLElement
        
        // Se o clique não foi no elemento editável nem em seu nó pai, finalizar edição
        if (editableElement && nodeElement && 
            !editableElement.contains(target) && 
            !nodeElement.contains(target)) {
          
          // Salvar o texto antes de sair da edição
          const newText = editableElement.textContent || ''
          if (newText.trim() !== '') {
            handleUpdateNodeText(editingNodeId, newText)
          }
          
          // Finalizar edição
          setEditingNodeId(null)
        }
      }
    }

    // Adicionar listener global
    document.addEventListener('mousedown', handleClickOutside)
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingNodeId])
  
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

  // Cores do tema selecionado
  const colors = selectedTheme.nodeColors

  // Função para obter cor do nó baseada no nível
  const getNodeColor = (level: number): string => {
    // Usar cores do tema selecionado, ciclando através das cores disponíveis
    const colorIndex = (level - 1) % colors.length
    return colors[colorIndex] || colors[0] || '#3B82F6'
  }

  // Handlers para temas
  const handleThemeSelect = (theme: MindMapTheme) => {
    setSelectedTheme(theme)
    setShowThemeSelector(false)
    // Atualizar cor selecionada para a cor primária do tema
    setSelectedColor(theme.primary)
  }

  const handleToggleThemeSelector = () => {
    setShowThemeSelector(!showThemeSelector)
    // Fechar seletor de cores se estiver aberto
    if (showColorPalette) {
      setShowColorPalette(false)
    }
  }

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

  const calculateTextDimensions = (text: string, fontSize: number = 14, level: number = 0): { width: number; height: number } => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return { width: 120, height: 50 }
    
    // Ajustar fonte baseado no nível hierárquico
    let adjustedFontSize = fontSize
    let fontWeight = 'normal'
    
    if (level === 0) { // Nó raiz
      adjustedFontSize = Math.max(20, fontSize + 6)
      fontWeight = '900'
    } else if (level === 1) { // Primeiro nível
      adjustedFontSize = Math.max(16, fontSize + 2)
      fontWeight = 'bold'
    } else if (level === 2) { // Segundo nível
      adjustedFontSize = Math.max(14, fontSize)
      fontWeight = '600'
    } else { // Níveis subsequentes
      adjustedFontSize = Math.max(12, fontSize - 1)
      fontWeight = '500'
    }
    
    context.font = `${fontWeight} ${adjustedFontSize}px Inter, system-ui, sans-serif`
    
    // Dividir texto em linhas (quebras manuais ou automáticas)
    const lines = text.split('\n')
    const maxCharsPerLine = Math.max(15, 40 - level * 5) // Menos caracteres por linha em níveis mais profundos
    
    let processedLines: string[] = []
    
    lines.forEach(line => {
      if (line.length <= maxCharsPerLine) {
        processedLines.push(line)
      } else {
        // Quebrar linha longa em múltiplas linhas
        const words = line.split(' ')
        let currentLine = ''
        
        words.forEach(word => {
          if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
            currentLine = currentLine ? currentLine + ' ' + word : word
          } else {
            if (currentLine) {
              processedLines.push(currentLine)
              currentLine = word
            } else {
              // Palavra muito longa, forçar quebra
              processedLines.push(word.substring(0, maxCharsPerLine))
              currentLine = word.substring(maxCharsPerLine)
            }
          }
        })
        
        if (currentLine) {
          processedLines.push(currentLine)
        }
      }
    })
    
    // Calcular largura máxima das linhas
    let maxWidth = 0
    processedLines.forEach(line => {
      const metrics = context.measureText(line)
      maxWidth = Math.max(maxWidth, metrics.width)
    })
    
    // Calcular altura baseada no número de linhas
    const lineHeight = adjustedFontSize * 1.4 // 1.4 é um bom line-height
    const totalTextHeight = processedLines.length * lineHeight
    
    // Padding baseado no nível
    const horizontalPadding = level === 0 ? 40 : (level === 1 ? 30 : 20)
    const verticalPadding = level === 0 ? 30 : (level === 1 ? 20 : 15)
    
    // Tamanhos mínimos baseados no nível
    const minWidth = level === 0 ? 150 : (level === 1 ? 120 : 100)
    const minHeight = level === 0 ? 60 : (level === 1 ? 50 : 40)
    
    return {
      width: Math.max(maxWidth + horizontalPadding, minWidth),
      height: Math.max(totalTextHeight + verticalPadding, minHeight)
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

  // Sistema simétrico de posicionamento automático
  const organizeNodesAutomatically = () => {
    const newNodes = [...data.nodes]
    const rootNode = newNodes.find(n => n.id === data.rootNodeId)
    if (!rootNode) return

    // Posicionar nó raiz no centro
    rootNode.x = 400
    rootNode.y = 300

    // Separar nós filhos diretos do nó raiz por lado
    const childNodes = newNodes.filter(node => node.parentId === data.rootNodeId)
    const leftNodes: MindMapNode[] = []
    const rightNodes: MindMapNode[] = []

    // Classificar nós por lado baseado na propriedade 'side' ou posição atual
    childNodes.forEach(node => {
      if (node.side === 'left' || (node.x < rootNode.x && !node.side)) {
        leftNodes.push(node)
      } else {
        rightNodes.push(node)
      }
    })

    // Configurações de layout
    const horizontalDistance = 250 // Distância horizontal do centro
    const verticalSpacing = 80 // Espaçamento vertical entre nós
    const startY = rootNode.y - ((Math.max(leftNodes.length, rightNodes.length) - 1) * verticalSpacing) / 2

    // Posicionar nós do lado esquerdo (empilhados verticalmente)
    leftNodes.forEach((node, index) => {
      node.x = rootNode.x - horizontalDistance
      node.y = startY + (index * verticalSpacing)
      node.side = 'left' // Garantir que a propriedade side está definida
    })

    // Posicionar nós do lado direito (empilhados verticalmente)
    rightNodes.forEach((node, index) => {
      node.x = rootNode.x + horizontalDistance
      node.y = startY + (index * verticalSpacing)
      node.side = 'right' // Garantir que a propriedade side está definida
    })

    // Posicionar nós de níveis mais profundos (netos, bisnetos, etc.)
    const organizeDeepNodes = (parentNodes: MindMapNode[], level: number) => {
      parentNodes.forEach(parentNode => {
        const children = newNodes.filter(node => node.parentId === parentNode.id)
        if (children.length === 0) return

        const isLeftSide = parentNode.side === 'left'
        const childHorizontalDistance = 200 + (level * 50)
        const childVerticalSpacing = 60

        children.forEach((child, index) => {
          if (isLeftSide) {
            child.x = parentNode.x - childHorizontalDistance
          } else {
            child.x = parentNode.x + childHorizontalDistance
          }
          
          // Centralizar filhos verticalmente em relação ao pai
          const totalHeight = (children.length - 1) * childVerticalSpacing
          const startChildY = parentNode.y - totalHeight / 2
          child.y = startChildY + (index * childVerticalSpacing)
          child.side = parentNode.side // Herdar o lado do pai
        })

        // Recursivamente organizar próximos níveis
        organizeDeepNodes(children, level + 1)
      })
    }

    // Organizar nós de níveis mais profundos
    organizeDeepNodes([...leftNodes, ...rightNodes], 1)
    
    updateData({ ...data, nodes: newNodes })
  }

  // Função para detectar e resolver colisões entre nós
  const applyCollisionDetection = (nodes: MindMapNode[]) => {
    const minDistance = 100 // Distância mínima entre nós
    const maxIterations = 10
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasCollisions = false
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < minDistance && distance > 0) {
            hasCollisions = true
            
            // Calcular força de repulsão
            const force = (minDistance - distance) / distance
            const forceX = dx * force * 0.5
            const forceY = dy * force * 0.5
            
            // Aplicar força (afastar os nós)
            nodeA.x -= forceX
            nodeA.y -= forceY
            nodeB.x += forceX
            nodeB.y += forceY
          }
        }
      }
      
      if (!hasCollisions) break
    }
  }

  // Função para posicionar automaticamente novos nós
  const getOptimalPositionForNewNode = (parentId: string): { x: number, y: number } => {
    const parentNode = data.nodes.find(n => n.id === parentId)
    if (!parentNode) return { x: 400, y: 300 }

    const rootNode = data.nodes.find(n => n.id === data.rootNodeId)
    if (!rootNode) return { x: parentNode.x + 150, y: parentNode.y }

    // Encontrar filhos existentes do pai
    const existingChildren = data.nodes.filter(n => n.parentId === parentId)
    const childCount = existingChildren.length

    // Calcular ângulo base (direção do pai em relação à raiz)
    const parentToRoot = Math.atan2(parentNode.y - rootNode.y, parentNode.x - rootNode.x)
    const baseDistance = 120 + (calculateNodeLevel(parentId, data.nodes)) * 40

    let angle: number
    if (childCount === 0) {
      // Primeiro filho: posicionar na direção oposta à raiz
      angle = parentToRoot
    } else {
      // Filhos subsequentes: distribuir em leque
      const spreadAngle = Math.PI / 3
      const startAngle = parentToRoot - spreadAngle / 2
      angle = startAngle + (childCount / Math.max(childCount, 1)) * spreadAngle
    }

    const newX = parentNode.x + Math.cos(angle) * baseDistance
    const newY = parentNode.y + Math.sin(angle) * baseDistance

    return { x: newX, y: newY }
  }

  // Handlers de eventos - melhorados
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
      // Pan suave e responsivo
      const newPanOffset = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      }
      setPanOffset(newPanOffset)
      
      // Feedback visual durante o pan
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    }
  }, [isDragging, selectedNodeId, isPanning, dragOffset, data, updateData, zoom, panOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsPanning(false)
    
    // Restaurar cursor padrão
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }
  }, [])

  const handleNodeDragStart = (nodeId: string, offset: { x: number; y: number }) => {
    setSelectedNodeId(nodeId)
    setIsDragging(true)
    setDragOffset(offset)
  }

  const handleNodeDoubleClick = (nodeId: string) => {
    setEditingNodeId(nodeId)
  }

  const handleAddChild = useCallback((parentId: string, side: 'left' | 'right' = 'right') => {
    const parentNode = data.nodes.find(n => n.id === parentId)
    if (!parentNode) return

    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const parentLevel = calculateNodeLevel(parentId, data.nodes)
    const dimensions = calculateTextDimensions('Novo Nó', 14, parentLevel + 1)
    
    // Calcular posição baseada no lado especificado
    const baseX = side === 'right' ? parentNode.x + parentNode.width + 150 : parentNode.x - 150 - dimensions.width
    
    // Contar nós filhos existentes no mesmo lado para posicionamento vertical
    const existingChildrenOnSide = data.nodes.filter(node => {
      if (node.parentId !== parentId) return false
      // Determinar o lado baseado na posição relativa ao pai
      const isOnRight = node.x > parentNode.x
      return side === 'right' ? isOnRight : !isOnRight
    })

    const verticalOffset = existingChildrenOnSide.length * (dimensions.height + 20)
    const newY = parentNode.y + verticalOffset
    
    const newNode: MindMapNode = {
      id: newNodeId,
      text: 'Novo Nó',
      x: baseX,
      y: newY,
      width: dimensions.width,
      height: dimensions.height,
      color: getNodeColor(parentLevel + 1),
      level: parentLevel + 1,
      parentId: parentId,
      children: [],
      isExpanded: true,
      isRoot: false,
      fontSize: 14
    }

    const newConnection: MindMapConnection = {
      id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromNodeId: parentId,
      toNodeId: newNodeId,
      type: 'curved'
    }

    // Atualizar o nó pai para incluir o novo filho
    const updatedNodes = data.nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNodeId],
          isExpanded: true
        }
      }
      return node
    })

    updateData({
      ...data,
      nodes: [...updatedNodes, newNode],
      connections: [...data.connections, newConnection]
    })

    setSelectedNodeId(newNodeId)
  }, [data, updateData])

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
    const node = data.nodes.find(n => n.id === nodeId)
    if (!node) return
    
    const nodeLevel = calculateNodeLevel(nodeId, data.nodes)
    const dimensions = calculateTextDimensions(newText, 14, nodeLevel)
    
    const newNodes = data.nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          text: newText,
          width: dimensions.width,
          height: dimensions.height
        }
      }
      return n
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

  const handleExportPNG = async () => {
    if (!svgRef.current) return
    
    try {
      // Criar um container temporário para o SVG
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      container.style.width = '2000px'
      container.style.height = '1500px'
      container.style.backgroundColor = 'white'
      document.body.appendChild(container)

      // Clonar o SVG
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement
      svgClone.style.width = '100%'
      svgClone.style.height = '100%'
      svgClone.setAttribute('width', '2000')
      svgClone.setAttribute('height', '1500')
      
      container.appendChild(svgClone)

      // Capturar com html2canvas
      const canvas = await html2canvas(container, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      // Remover container temporário
      document.body.removeChild(container)

      // Fazer download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'mapa-mental.png'
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Erro ao exportar PNG:', error)
      alert('Erro ao gerar imagem PNG. Tente novamente.')
    }
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

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.2, 5) // Aumentado limite máximo para 5x
    setZoom(newZoom)
  }, [zoom])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.2, 0.2) // Diminuído limite mínimo para 0.2x
    setZoom(newZoom)
  }, [zoom])

  // Função para resetar zoom e pan
  const handleResetView = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  // Função para zoom com mouse wheel - melhorada
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calcular posição do mouse no espaço do SVG antes do zoom
    const svgMouseX = (mouseX - panOffset.x) / zoom
    const svgMouseY = (mouseY - panOffset.y) / zoom
    
    // Determinar direção do zoom com sensibilidade melhorada
    const zoomSensitivity = 0.1
    const zoomDirection = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity
    const zoomFactor = 1 + zoomDirection
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.2), 5) // Ampliado range: 0.2x a 5x
    
    // Calcular novo pan offset para manter o mouse na mesma posição
    const newPanX = mouseX - svgMouseX * newZoom
    const newPanY = mouseY - svgMouseY * newZoom
    
    setZoom(newZoom)
    setPanOffset({ x: newPanX, y: newPanY })
  }, [zoom, panOffset])

  // Função para iniciar pan com mouse - melhorada
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Verificar se o clique foi no SVG ou no container (não em um nó ou controle)
    const target = e.target as Element
    const isClickOnBackground = (
      target === svgRef.current || 
      target === containerRef.current ||
      target.tagName === 'svg' ||
      (target.closest('svg') === svgRef.current && !target.closest('[data-node]') && !target.closest('[data-control]'))
    )
    
    if (isClickOnBackground) {
      e.preventDefault()
      setIsPanning(true)
      setDragOffset({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      })
      
      // Adicionar cursor de pan
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
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
      className={`relative w-full h-full overflow-hidden pt-20 cursor-grab active:cursor-grabbing ${className}`}
      style={{
        background: selectedTheme.background,
        touchAction: 'none',
        userSelect: 'none'
      }}
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
        onExportPNG={handleExportPNG}
        onShare={handleShare}
        onCenterRoot={handleCenterRoot}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onColorSelect={handleColorSelect}
        selectedColor={selectedColor}
        colors={colors}
        showColorPalette={showColorPalette}
        onToggleColorPalette={() => setShowColorPalette(!showColorPalette)}
        // Theme props
        onThemeSelect={handleThemeSelect}
        selectedTheme={selectedTheme}
        availableThemes={mindMapThemes}
        showThemeSelector={showThemeSelector}
        onToggleThemeSelector={handleToggleThemeSelector}
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
        {/* Definições para efeitos glassmorphism globais vibrantes */}
        <defs>
          {/* Gradiente de fundo glassmorphism vibrante */}
          <radialGradient id="glassmorphism-background" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={selectedTheme.nodeColors[0]} stopOpacity="0.2" />
            <stop offset="30%" stopColor={selectedTheme.nodeColors[1] || selectedTheme.nodeColors[0]} stopOpacity="0.15" />
            <stop offset="60%" stopColor={selectedTheme.nodeColors[2] || selectedTheme.nodeColors[0]} stopOpacity="0.1" />
            <stop offset="100%" stopColor={selectedTheme.background} stopOpacity="0.05" />
          </radialGradient>
          
          {/* Gradiente animado para fundo dinâmico */}
          <radialGradient id="dynamic-background" cx="50%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.1">
              <animate attributeName="stop-color" 
                values="#FF6B6B;#4ECDC4;#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B" 
                dur="10s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="#4ECDC4" stopOpacity="0.08">
              <animate attributeName="stop-color" 
                values="#4ECDC4;#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B;#4ECDC4" 
                dur="12s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="#45B7D1" stopOpacity="0.05">
              <animate attributeName="stop-color" 
                values="#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B;#4ECDC4;#45B7D1" 
                dur="8s" repeatCount="indefinite"/>
            </stop>
          </radialGradient>
          
          {/* Filtro de blur intenso para fundo */}
          <filter id="background-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
            <feColorMatrix type="saturate" values="1.5"/>
            <feComponentTransfer>
              <feFuncA type="gamma" amplitude="1" exponent="0.8"/>
            </feComponentTransfer>
          </filter>
          
          {/* Padrão de ruído vibrante para textura de fundo */}
          <filter id="background-noise">
            <feTurbulence baseFrequency="0.03" numOctaves="4" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0.3"/>
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0.02 0.04 0.06 0.08"/>
            </feComponentTransfer>
            <feComposite operator="overlay" in2="SourceGraphic"/>
          </filter>
        </defs>

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
              theme={selectedTheme}
            />
          ))}
      </svg>

      {/* Mini-mapa */}
      <MiniMap
        data={data}
        zoom={zoom}
        panOffset={panOffset}
        onPanChange={setPanOffset}
        theme={selectedTheme}
      />
    </div>
  )
}

export default NativeMindMap