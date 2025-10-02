'use client'

import React, { useState, useEffect } from 'react'
import NativeMindMap, { MindMapData } from '@/components/mind-map/native-mind-map'
import { Brain, Info, Keyboard, Mouse, Palette, Share2, Download, Sparkles, X, Loader2 } from 'lucide-react'
import { AIMindMapGeneratorService } from '@/services/ai-mindmap-generator.service'

const initialData: MindMapData = {
  nodes: [
    {
      id: 'root',
      text: 'Mapa Mental',
      x: 400,
      y: 300,
      width: 200,
      height: 80,
      color: '#3b82f6',
      level: 0,
      parentId: undefined,
      isExpanded: true,
      children: []
    }
  ],
  connections: [],
  rootNodeId: 'root'
}

export default function NativeMindMapPage() {
  const [data, setData] = useState<MindMapData>(initialData)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  // Carregar dados da URL se disponível
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sharedData = urlParams.get('data')
    
    if (sharedData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(sharedData))
        setData(parsedData)
      } catch (error) {
        console.error('Erro ao carregar dados compartilhados:', error)
      }
    }
  }, [])

  const handleDataChange = (newData: MindMapData) => {
    setData(newData)
    console.log('Dados do mapa mental atualizados:', newData)
  }

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      setAiError('Por favor, digite um tópico para gerar o mapa mental.')
      return
    }

    setIsGenerating(true)
    setAiError('')

    try {
      const result = await AIMindMapGeneratorService.generateMindMap({
        topic: aiTopic.trim(),
        maxLevels: 3,
        maxNodes: 12
      })

      setData(result.mindMapData)
      setShowAIModal(false)
      setAiTopic('')
    } catch (error: any) {
      console.error('Erro ao gerar mapa mental com IA:', error)
      setAiError(error.message || 'Erro ao gerar mapa mental. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCloseAIModal = () => {
    setShowAIModal(false)
    setAiTopic('')
    setAiError('')
    setIsGenerating(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Mapa Mental</h1>
                <p className="text-sm text-gray-500">Organize suas ideias de forma visual</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAIModal(true)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                <span>Gerar com IA</span>
              </button>
              
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Info className="h-4 w-4" />
                <span>Ajuda</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mind Map Area */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="h-[calc(100vh-200px)] min-h-[600px]">
                <NativeMindMap
                  data={data}
                  onDataChange={handleDataChange}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        {showInstructions && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Keyboard className="h-5 w-5 mr-2 text-blue-600" />
                Como usar o Mapa Mental
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mouse Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Mouse className="h-4 w-4 mr-2 text-green-600" />
                    Ações do Mouse
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Clique simples para selecionar um nó</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Duplo clique para editar o texto</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Arraste para mover os nós</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Botão + verde para adicionar filhos</span>
                    </li>
                  </ul>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Keyboard className="h-4 w-4 mr-2 text-purple-600" />
                    Atalhos do Teclado
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center justify-between">
                      <span>Adicionar filho</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Tab</kbd>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Editar texto</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Enter</kbd>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Remover nó</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Delete</kbd>
                    </li>
                  </ul>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Palette className="h-4 w-4 mr-2 text-orange-600" />
                    Recursos Disponíveis
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Controles de zoom na toolbar</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Personalização de cores</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Exportar como JSON ou SVG</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Compartilhamento via URL</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Gerar Mapa Mental com IA</h3>
              </div>
              <button
                onClick={handleCloseAIModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700 mb-2">
                    Sobre o que você quer criar um mapa mental?
                  </label>
                  <textarea
                    id="ai-topic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ex: Fotossíntese, Sistema Solar, Marketing Digital..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{aiError}</p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={handleCloseAIModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={isGenerating}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || !aiTopic.trim()}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Gerar Mapa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}