'use client'

import React from 'react'
import { Plus, Minus, RotateCcw, Download, Share2, Home, Palette } from 'lucide-react'

interface MindMapControlsProps {
  onAddNode: () => void
  onDeleteNode: () => void
  onAutoOrganize: () => void
  onExportJSON: () => void
  onExportSVG: () => void
  onShare: () => void
  onCenterRoot: () => void
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
  onColorSelect,
  selectedColor,
  colors,
  showColorPalette,
  onToggleColorPalette
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
      {/* Botões principais */}
      <div className="flex gap-2">
        <button
          onClick={onAddNode}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Adicionar Nó"
        >
          <Plus size={16} />
        </button>
        
        <button
          onClick={onDeleteNode}
          className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          title="Deletar Nó"
        >
          <Minus size={16} />
        </button>
        
        <button
          onClick={onAutoOrganize}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          title="Organizar Automaticamente"
        >
          <RotateCcw size={16} />
        </button>
        
        <button
          onClick={onCenterRoot}
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          title="Centralizar na Raiz"
        >
          <Home size={16} />
        </button>
      </div>

      {/* Botões de exportação e compartilhamento */}
      <div className="flex gap-2">
        <button
          onClick={onExportJSON}
          className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs"
          title="Exportar JSON"
        >
          JSON
        </button>
        
        <button
          onClick={onExportSVG}
          className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs"
          title="Exportar SVG"
        >
          SVG
        </button>
        
        <button
          onClick={onShare}
          className="p-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
          title="Compartilhar"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Seletor de cores */}
      <div className="relative">
        <button
          onClick={onToggleColorPalette}
          className="p-2 rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
          title="Selecionar Cor"
        >
          <Palette size={16} />
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: selectedColor }}
          />
        </button>
        
        {showColorPalette && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 z-20">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                  selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MindMapControls