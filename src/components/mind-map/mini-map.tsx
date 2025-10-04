'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { MindMapData, MindMapNode } from './native-mind-map'
import { MindMapTheme } from '@/constants/mind-map-themes'
import { Map, Hand, Eye } from 'lucide-react'

interface MiniMapProps {
  data: MindMapData
  zoom: number
  panOffset: { x: number; y: number }
  onPanChange: (offset: { x: number; y: number }) => void
  theme?: MindMapTheme
  className?: string
}

const MiniMap: React.FC<MiniMapProps> = ({
  data,
  zoom,
  panOffset,
  onPanChange,
  theme,
  className = ''
}) => {
  const [isActive, setIsActive] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const miniMapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Configurações do mini-mapa
  const MINIMAP_WIDTH = 200
  const MINIMAP_HEIGHT = 150
  const SCALE_FACTOR = 0.1 // Escala para reduzir o mapa mental

  // Calcular bounds do mapa mental
  const calculateBounds = useCallback(() => {
    if (data.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    data.nodes.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + node.height)
    })

    // Adicionar padding
    const padding = 100
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    }
  }, [data.nodes])

  const bounds = calculateBounds()
  const mapWidth = bounds.maxX - bounds.minX
  const mapHeight = bounds.maxY - bounds.minY

  // Calcular escala para caber no mini-mapa
  const scaleX = MINIMAP_WIDTH / mapWidth
  const scaleY = MINIMAP_HEIGHT / mapHeight
  const scale = Math.min(scaleX, scaleY, SCALE_FACTOR)

  // Converter coordenadas do mapa para mini-mapa
  const toMiniMapCoords = useCallback((x: number, y: number) => {
    return {
      x: (x - bounds.minX) * scale,
      y: (y - bounds.minY) * scale
    }
  }, [bounds, scale])

  // Converter coordenadas do mini-mapa para mapa
  const fromMiniMapCoords = useCallback((x: number, y: number) => {
    return {
      x: (x / scale) + bounds.minX,
      y: (y / scale) + bounds.minY
    }
  }, [bounds, scale])

  // Calcular posição do viewport no mini-mapa
  const getViewportRect = useCallback(() => {
    const viewportWidth = window.innerWidth / zoom
    const viewportHeight = window.innerHeight / zoom
    const viewportX = -panOffset.x / zoom
    const viewportY = -panOffset.y / zoom

    const miniViewport = {
      x: (viewportX - bounds.minX) * scale,
      y: (viewportY - bounds.minY) * scale,
      width: viewportWidth * scale,
      height: viewportHeight * scale
    }

    return miniViewport
  }, [panOffset, zoom, bounds, scale])

  // Handlers de mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) {
      setIsActive(true)
      return
    }

    e.preventDefault()
    setIsDragging(true)
    
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setDragStart({ x, y })

      // Mover viewport para posição clicada
      const mapCoords = fromMiniMapCoords(x, y)
      const newPanOffset = {
        x: -(mapCoords.x * zoom) + window.innerWidth / 2,
        y: -(mapCoords.y * zoom) + window.innerHeight / 2
      }
      onPanChange(newPanOffset)
    }
  }, [isActive, fromMiniMapCoords, zoom, onPanChange])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const mapCoords = fromMiniMapCoords(x, y)
    const newPanOffset = {
      x: -(mapCoords.x * zoom) + window.innerWidth / 2,
      y: -(mapCoords.y * zoom) + window.innerHeight / 2
    }
    onPanChange(newPanOffset)
  }, [isDragging, fromMiniMapCoords, zoom, onPanChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Event listeners globais
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Fechar mini-mapa ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isActive && miniMapRef.current && !miniMapRef.current.contains(e.target as Node)) {
        setIsActive(false)
      }
    }

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isActive])

  const viewport = getViewportRect()

  return (
    <div
      ref={miniMapRef}
      className={`fixed bottom-6 right-6 z-30 transition-all duration-300 ${className}`}
      style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))' }}
    >
      {!isActive ? (
        // Botão do mini-mapa colapsado
        <button
          onClick={() => setIsActive(true)}
          className="w-14 h-14 rounded-xl shadow-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-2xl flex items-center justify-center backdrop-blur-sm"
          style={{
            backgroundColor: theme?.controlsBackground || 'rgba(255, 255, 255, 0.95)',
            borderColor: theme?.selectedNodeBorder || '#6366f1',
            color: theme?.controlsText || '#374151'
          }}
          title="Abrir Mini-mapa"
        >
          <Map size={22} />
        </button>
      ) : (
        // Mini-mapa expandido
        <div
          className="rounded-xl shadow-2xl border-2 overflow-hidden backdrop-blur-sm"
          style={{
            backgroundColor: theme?.controlsBackground || 'rgba(255, 255, 255, 0.95)',
            borderColor: theme?.selectedNodeBorder || '#6366f1',
            width: MINIMAP_WIDTH + 20,
            height: MINIMAP_HEIGHT + 50
          }}
        >
          {/* Header do mini-mapa */}
          <div 
            className="flex items-center justify-between p-2 border-b"
            style={{
              borderColor: theme?.shadowColor || 'rgba(0, 0, 0, 0.1)',
              color: theme?.controlsText || '#374151'
            }}
          >
            <div className="flex items-center gap-2">
              <Eye size={16} />
              <span className="text-sm font-medium">Navegação</span>
            </div>
            <button
              onClick={() => setIsActive(false)}
              className="w-6 h-6 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          {/* SVG do mini-mapa */}
          <div className="p-2">
            <svg
              ref={svgRef}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              className={`border rounded cursor-${isDragging ? 'grabbing' : 'grab'}`}
              style={{
                backgroundColor: theme?.background || '#f8fafc',
                borderColor: theme?.shadowColor || 'rgba(0, 0, 0, 0.1)'
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Renderizar nós do mapa mental */}
              {data.nodes.map(node => {
                const miniCoords = toMiniMapCoords(node.x, node.y)
                const miniWidth = node.width * scale
                const miniHeight = node.height * scale

                return (
                  <rect
                    key={node.id}
                    x={miniCoords.x}
                    y={miniCoords.y}
                    width={Math.max(miniWidth, 2)}
                    height={Math.max(miniHeight, 2)}
                    fill={node.color}
                    stroke={theme?.selectedNodeBorder || '#6366f1'}
                    strokeWidth={0.5}
                    rx={1}
                  />
                )
              })}

              {/* Renderizar conexões */}
              {data.connections.map(connection => {
                const fromNode = data.nodes.find(n => n.id === connection.fromNodeId)
                const toNode = data.nodes.find(n => n.id === connection.toNodeId)
                
                if (!fromNode || !toNode) return null

                const fromCoords = toMiniMapCoords(
                  fromNode.x + fromNode.width / 2,
                  fromNode.y + fromNode.height / 2
                )
                const toCoords = toMiniMapCoords(
                  toNode.x + toNode.width / 2,
                  toNode.y + toNode.height / 2
                )

                return (
                  <line
                    key={connection.id}
                    x1={fromCoords.x}
                    y1={fromCoords.y}
                    x2={toCoords.x}
                    y2={toCoords.y}
                    stroke={theme?.connectionColor || '#64748b'}
                    strokeWidth={1}
                    opacity={0.6}
                  />
                )
              })}

              {/* Viewport indicator */}
              <rect
                x={Math.max(0, viewport.x)}
                y={Math.max(0, viewport.y)}
                width={Math.min(viewport.width, MINIMAP_WIDTH - Math.max(0, viewport.x))}
                height={Math.min(viewport.height, MINIMAP_HEIGHT - Math.max(0, viewport.y))}
                fill="none"
                stroke={theme?.selectedNodeBorder || '#6366f1'}
                strokeWidth={2}
                strokeDasharray="4,2"
                opacity={0.8}
              />

              {/* Indicador de cursor */}
              {isDragging && (
                <g>
                  <defs>
                    <filter id="hand-shadow">
                      <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
                    </filter>
                  </defs>
                  <Hand
                    x={dragStart.x - 8}
                    y={dragStart.y - 8}
                    size={16}
                    fill={theme?.selectedNodeBorder || '#6366f1'}
                    filter="url(#hand-shadow)"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default MiniMap