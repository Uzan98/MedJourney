'use client'

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

// Importação dinâmica do ReactQuill para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface InlineEditorProps {
  nodeId: string
  initialText: string
  onSave: (text: string) => void
  onCancel: () => void
  position: { x: number; y: number }
  onFormatChange?: (formats: {
    bold: boolean
    italic: boolean
    underline: boolean
    align: 'left' | 'center' | 'right'
    fontSize: string
  }) => void
}

const InlineEditor = forwardRef<any, InlineEditorProps>(({ 
  nodeId,
  initialText,
  onSave,
  onCancel,
  position,
  onFormatChange
}, ref) => {
  const [text, setText] = useState(initialText)
  const [isRichTextMode, setIsRichTextMode] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const quillRef = useRef<any>(null)

  useEffect(() => {
    if (isRichTextMode && quillRef.current) {
      const editor = quillRef.current.getEditor()
      editor.focus()
      editor.setSelection(0, editor.getLength())
    } else if (!isRichTextMode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRichTextMode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleSave = () => {
    const finalText = text.trim() || 'Novo Nó'
    onSave(finalText)
  }

  const handleBlur = () => {
    // Pequeno delay para permitir cliques nos botões
    setTimeout(() => {
      handleSave()
    }, 150)
  }

  const toggleRichTextMode = () => {
    setIsRichTextMode(!isRichTextMode)
  }

  // Configurações do Quill
  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'size': ['small', false, 'large'] }],
      ['clean']
    ],
  }

  const quillFormats = [
    'bold', 'italic', 'underline',
    'color', 'background',
    'size'
  ]

  // Expor métodos para o componente pai
  useImperativeHandle(ref, () => ({
    formatText: (format: string, value?: string) => {
      // Ativar modo rich text se não estiver ativo
      if (!isRichTextMode) {
        setIsRichTextMode(true)
        // Aguardar um tick para o Quill ser inicializado
        setTimeout(() => {
          applyFormat(format, value)
        }, 100)
      } else {
        applyFormat(format, value)
      }
    }
  }))

  const applyFormat = (format: string, value?: string) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor()
      const range = quill.getSelection()
      
      if (range) {
        switch (format) {
          case 'bold':
            quill.format('bold', !quill.getFormat(range).bold)
            break
          case 'italic':
            quill.format('italic', !quill.getFormat(range).italic)
            break
          case 'underline':
            quill.format('underline', !quill.getFormat(range).underline)
            break
          case 'align':
            quill.format('align', value)
            break
          case 'size':
            quill.format('size', value)
            break
          case 'list':
            quill.format('list', value)
            break
        }
        
        // Notificar mudanças de formato
        if (onFormatChange) {
          const formats = quill.getFormat(range)
          onFormatChange({
            bold: !!formats.bold,
            italic: !!formats.italic,
            underline: !!formats.underline,
            align: formats.align || 'left',
            fontSize: formats.size || '16px'
          })
        }
      }
    }
  }

  return (
    <div
      className="absolute z-50 bg-white border-2 border-blue-500 rounded-lg shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        width: Math.max(300, text.length * 8 + 60),
        minHeight: isRichTextMode ? 200 : 40
      }}
    >
      {/* Barra de ferramentas */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRichTextMode}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              isRichTextMode 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isRichTextMode ? 'Texto Rico' : 'Texto Simples'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Salvar
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="p-2">
        {isRichTextMode ? (
          <div className="rich-text-editor">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={text}
              onChange={setText}
              modules={quillModules}
              formats={quillFormats}
              style={{
                minHeight: '100px',
                fontSize: '14px'
              }}
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500"
            style={{
              fontSize: '14px',
              color: '#333',
              backgroundColor: '#fff',
              textAlign: 'center'
            }}
            placeholder="Digite o texto do nó..."
          />
        )}
      </div>
    </div>
  )
})

InlineEditor.displayName = 'InlineEditor'

export default InlineEditor