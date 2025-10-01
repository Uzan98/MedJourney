'use client'

import React, { useState, useEffect } from 'react'
import NativeMindMap, { MindMapData } from '@/components/mind-map/native-mind-map'

const initialData: MindMapData = {
  nodes: [
    {
      id: 'root',
      text: 'Mapa Mental Nativo',
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Sistema de Mapa Mental Nativo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '80vh' }}>
          <NativeMindMap
            data={data}
            onDataChange={handleDataChange}
            className="w-full h-full"
          />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Instruções:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Clique em um nó para selecioná-lo</li>
            <li>Duplo clique para editar o texto</li>
            <li>Arraste os nós para reposicioná-los</li>
            <li>Use o botão + verde para adicionar nós filhos</li>
            <li>Pressione Tab para adicionar filho rapidamente</li>
            <li>Pressione Delete para remover nó selecionado</li>
            <li>Pressione Enter para editar texto</li>
            <li>Use os controles de zoom e cores na toolbar</li>
            <li>Exporte como JSON ou SVG usando os botões na toolbar</li>
            <li>Compartilhe usando o botão de compartilhar</li>
          </ul>
        </div>
      </div>
    </div>
  )
}