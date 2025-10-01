'use client'

import React, { useState, useRef, useEffect } from 'react'

interface InlineEditorProps {
  nodeId: string
  initialText: string
  onSave: (text: string) => void
  onCancel: () => void
  position: {
    x: number
    y: number
  }
}

const InlineEditor: React.FC<InlineEditorProps> = ({
  nodeId,
  initialText,
  onSave,
  onCancel,
  position
}) => {
  const [text, setText] = useState(initialText)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave(text.trim() || 'Novo Nó')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    onSave(text.trim() || 'Novo Nó')
  }

  return (
    <div
      className="absolute z-50"
      style={{
        left: position.x,
        top: position.y,
        width: Math.max(200, text.length * 8 + 40),
        height: 40
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-full px-3 py-2 border-2 border-blue-500 rounded-md outline-none shadow-lg"
        style={{
          fontSize: '14px',
          color: '#333',
          backgroundColor: '#fff',
          textAlign: 'center'
        }}
      />
    </div>
  )
}

export default InlineEditor