'use client'

import React, { useState } from 'react'
import { Plus, Minus, RotateCcw, Download, Share2, Home, Palette, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Type, Image, Paintbrush } from 'lucide-react'
import { MindMapTheme } from '@/constants/mind-map-themes'

interface MindMapControlsProps {
  onAddNode: () => void
  onDeleteNode: () => void
  onAutoOrganize: () => void
  onExportJSON: () => void
  onExportSVG: () => void
  onExportPNG: () => void
  onShare: () => void
  onCenterRoot: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onColorSelect: (color: string) => void
  selectedColor: string
  colors: string[]
  showColorPalette: boolean
  onToggleColorPalette: () => void
  // Theme props
  onThemeSelect?: (theme: MindMapTheme) => void
  selectedTheme?: MindMapTheme
  availableThemes?: MindMapTheme[]
  showThemeSelector?: boolean
  onToggleThemeSelector?: () => void
  // Rich text formatting props
  onBold?: () => void
  onItalic?: () => void
  onUnderline?: () => void
  onBulletList?: () => void
  onAlignLeft?: () => void
  onAlignCenter?: () => void
  onAlignRight?: () => void
  onFontSize?: (size: string) => void
  selectedFormats?: {
    bold: boolean
    italic: boolean
    underline: boolean
    align: 'left' | 'center' | 'right'
    fontSize: string
  }
}

const MindMapControls: React.FC<MindMapControlsProps> = ({
  onAddNode,
  onDeleteNode,
  onAutoOrganize,
  onExportJSON,
  onExportSVG,
  onExportPNG,
  onShare,
  onCenterRoot,
  onZoomIn,
  onZoomOut,
  onColorSelect,
  selectedColor,
  colors,
  showColorPalette,
  onToggleColorPalette,
  // Theme handlers
  onThemeSelect,
  selectedTheme,
  availableThemes = [],
  showThemeSelector = false,
  onToggleThemeSelector,
  // Rich text formatting handlers
  onBold,
  onItalic,
  onUnderline,
  onBulletList,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onFontSize,
  selectedFormats
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRichTextOptions, setShowRichTextOptions] = useState(false)

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

  return (
    <div 
      className={`absolute top-4 left-4 z-10 rounded-xl shadow-xl border p-3 transition-all duration-300 ease-in-out ${
        isExpanded ? 'right-4' : 'w-auto'
      }`}
      style={{
        backgroundColor: selectedTheme?.controlsBackground || 'rgba(255, 255, 255, 0.95)',
        borderColor: selectedTheme?.shadowColor || 'rgba(0, 0, 0, 0.1)',
        color: selectedTheme?.controlsText || '#374151'
      }}
    >
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
          
          {/* Rich Text Formatting Options */}
          <div className="relative">
            <button
              onClick={() => setShowRichTextOptions(!showRichTextOptions)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
              title="Opções de Formatação"
            >
              <Type size={16} />
            </button>
            
            {showRichTextOptions && (
              <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-3 z-20 min-w-[300px]">
                <div className="space-y-3">
                  {/* Formatação de Texto */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-16">Texto:</span>
                    <div className="flex gap-1">
                      {onBold && (
                        <button
                          onClick={onBold}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.bold 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Negrito"
                        >
                          <Bold size={14} />
                        </button>
                      )}
                      {onItalic && (
                        <button
                          onClick={onItalic}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.italic 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Itálico"
                        >
                          <Italic size={14} />
                        </button>
                      )}
                      {onUnderline && (
                        <button
                          onClick={onUnderline}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.underline 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Sublinhado"
                        >
                          <Underline size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alinhamento */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-16">Alinhar:</span>
                    <div className="flex gap-1">
                      {onAlignLeft && (
                        <button
                          onClick={onAlignLeft}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.align === 'left' 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Alinhar à Esquerda"
                        >
                          <AlignLeft size={14} />
                        </button>
                      )}
                      {onAlignCenter && (
                        <button
                          onClick={onAlignCenter}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.align === 'center' 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Centralizar"
                        >
                          <AlignCenter size={14} />
                        </button>
                      )}
                      {onAlignRight && (
                        <button
                          onClick={onAlignRight}
                          className={`p-2 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105 ${
                            selectedFormats?.align === 'right' 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title="Alinhar à Direita"
                        >
                          <AlignRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista */}
                  {onBulletList && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-16">Lista:</span>
                      <button
                        onClick={onBulletList}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 w-8 h-8 flex items-center justify-center hover:scale-105"
                        title="Lista com Marcadores"
                      >
                        <List size={14} />
                      </button>
                    </div>
                  )}

                  {/* Tamanho da Fonte */}
                  {onFontSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-16">Tamanho:</span>
                      <select
                        onChange={(e) => onFontSize(e.target.value)}
                        value={selectedFormats?.fontSize || '16px'}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                      >
                        {fontSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <button
            onClick={onExportJSON}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Exportar JSON"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={onExportPNG}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
            title="Baixar PNG"
          >
            <Image size={16} />
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

          {/* Theme Selector */}
          {onToggleThemeSelector && (
            <div className="relative">
              <button
                onClick={onToggleThemeSelector}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 w-10 h-10 flex items-center justify-center hover:scale-105"
                title="Selecionar Tema"
              >
                <div className="relative">
                  <Paintbrush size={16} />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: selectedTheme?.nodeColors?.[0] || '#3B82F6' }}
                  />
                </div>
              </button>
              
              {showThemeSelector && (
                <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-3 z-20 min-w-[200px]">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Selecionar Tema</h3>
                    {availableThemes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => onThemeSelect?.(theme)}
                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          selectedTheme?.id === theme.id 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.nodeColors[0]}, ${theme.nodeColors[1] || theme.nodeColors[0]})`
                        }}
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium text-white drop-shadow-sm">
                            {theme.name}
                          </div>
                          <div className="text-xs text-white/80 mt-1">
                            {theme.nodeColors.length} cores disponíveis
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MindMapControls