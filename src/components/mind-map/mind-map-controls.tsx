'use client'

import React, { useState } from 'react'
import { Plus, Minus, RotateCcw, Download, Share2, Home, Palette, ChevronRight, ChevronLeft, ZoomIn, ZoomOut } from 'lucide-react'

interface MindMapControlsProps {
  onAddNode: () => void
  onDeleteNode: () => void
  onAutoOrganize: () => void
  onExportJSON: () => void
  onExportSVG: () => void
  onShare: () => void
  onCenterRoot: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onColorSelect: (color: string) => void
  selectedColor: string
  colors: string[]
  showColorPalette: boolean
  onToggleColorPalette: () => void
}

const MindMapControls: React.FC<MindMapControlsProps> = ({
  onAddNode,
  onDeleteNode,
  onAutoOrganize,
  onExportJSON,
  onExportSVG,
  onShare,
  onCenterRoot,
  onZoomIn,
  onZoomOut,
  onColorSelect,
  selectedColor,
  colors,
  showColorPalette,
  onToggleColorPalette
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-3 transition-all duration-300 ease-in-out ${
      isExpanded ? 'right-4' : 'w-auto'
    }`}>
      <div className="flex items-center gap-2">
        {/* Botão de toggle sempre visível */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105 shadow-sm"
          title={isExpanded ? "Contrair Menu" : "Expandir Menu"}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Botões essenciais sempre visíveis */}
        <button
          onClick={onAddNode}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105 shadow-sm"
          title="Adicionar Nó"
        >
          <Plus size={16} />
        </button>
        
        <button
          onClick={onDeleteNode}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105 shadow-sm"
          title="Deletar Nó"
        >
          <Minus size={16} />
        </button>

        {/* Botões adicionais visíveis apenas quando expandido */}
        <div className={`flex items-center gap-2 transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 max-w-none' : 'opacity-0 max-w-0 overflow-hidden'
        }`}>
          <button
            onClick={onAutoOrganize}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105 shadow-sm"
            title="Organizar Automaticamente"
          >
            <RotateCcw size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <button
            onClick={onExportJSON}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Exportar JSON"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={onShare}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Compartilhar"
          >
            <Share2 size={16} />
          </button>
          
          <button
            onClick={onCenterRoot}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Centralizar"
          >
            <Home size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <button
            onClick={onZoomIn}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          
          <button
            onClick={onZoomOut}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <div className="relative">
            <button
              onClick={onToggleColorPalette}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
              title="Selecionar Cor"
            >
              <div className="relative">
                <Palette size={16} />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>
            </button>
            
            {showColorPalette && (
              <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-3 grid grid-cols-6 gap-2 z-20">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorSelect(color)}
                    className={`w-6 h-6 rounded-lg border-2 hover:scale-110 transition-transform shadow-sm ${
                      selectedColor === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MindMapControls