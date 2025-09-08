import { NextRequest, NextResponse } from 'next/server'
import { extractText, getDocumentProxy } from 'unpdf'

export async function POST(request: NextRequest) {
  console.log('📄 Iniciando processamento de PDF...')
  
  try {
    console.log('📋 Extraindo formData...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('❌ Nenhum arquivo encontrado')
      return NextResponse.json({ error: 'Nenhum arquivo encontrado' }, { status: 400 })
    }
    
    console.log(`📁 Arquivo recebido: ${file.name}, tamanho: ${file.size} bytes`)
    
    console.log('🔄 Convertendo arquivo para Uint8Array...')
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    console.log('📖 Carregando PDF com UnPDF...')
    const pdf = await getDocumentProxy(uint8Array)
    
    console.log('📝 Extraindo texto do PDF...')
    const { totalPages, text } = await extractText(pdf, { mergePages: true })
    
    console.log(`✅ Texto extraído com sucesso! Páginas: ${totalPages}`)
    
    return NextResponse.json({
      text: text,
      pages: totalPages,
      info: {
        filename: file.name,
        size: file.size
      }
    })
    
  } catch (error) {
    console.error('❌ Erro durante o processamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}