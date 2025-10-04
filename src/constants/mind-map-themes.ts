export interface MindMapTheme {
  id: string
  name: string
  background: string
  nodeColors: string[]
  connectionColor: string
  textColor: string
  selectedNodeBorder: string
  controlsBackground: string
  controlsText: string
  shadowColor: string
}

export const mindMapThemes: MindMapTheme[] = [
  {
    id: 'light',
    name: 'Claro Moderno',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    nodeColors: [
      '#6366f1', '#ec4899', '#10b981', '#f59e0b',
      '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16',
      '#f97316', '#3b82f6', '#14b8a6', '#f43f5e'
    ],
    connectionColor: '#64748b',
    textColor: '#ffffff',
    selectedNodeBorder: '#6366f1',
    controlsBackground: 'rgba(255, 255, 255, 0.95)',
    controlsText: '#374151',
    shadowColor: 'rgba(0, 0, 0, 0.15)'
  },
  {
    id: 'dark',
    name: 'Escuro Premium',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    nodeColors: [
      '#818cf8', '#f472b6', '#34d399', '#fbbf24',
      '#a78bfa', '#f87171', '#22d3ee', '#a3e635',
      '#fb923c', '#60a5fa', '#2dd4bf', '#fb7185'
    ],
    connectionColor: '#94a3b8',
    textColor: '#ffffff',
    selectedNodeBorder: '#818cf8',
    controlsBackground: 'rgba(15, 23, 42, 0.95)',
    controlsText: '#e2e8f0',
    shadowColor: 'rgba(0, 0, 0, 0.4)'
  },
  {
    id: 'medical',
    name: 'Médico Profissional',
    background: 'linear-gradient(135deg, #fefefe 0%, #f0f9ff 100%)',
    nodeColors: [
      '#dc2626', '#059669', '#2563eb', '#7c3aed',
      '#db2777', '#ea580c', '#0891b2', '#65a30d',
      '#be123c', '#9333ea', '#0d9488', '#c2410c'
    ],
    connectionColor: '#6b7280',
    textColor: '#ffffff',
    selectedNodeBorder: '#dc2626',
    controlsBackground: 'rgba(254, 254, 254, 0.95)',
    controlsText: '#374151',
    shadowColor: 'rgba(220, 38, 38, 0.15)'
  },
  {
    id: 'nature',
    name: 'Natureza Vibrante',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    nodeColors: [
      '#16a34a', '#059669', '#0d9488', '#0891b2',
      '#84cc16', '#65a30d', '#ca8a04', '#d97706',
      '#dc2626', '#be123c', '#7c3aed', '#9333ea'
    ],
    connectionColor: '#22c55e',
    textColor: '#ffffff',
    selectedNodeBorder: '#16a34a',
    controlsBackground: 'rgba(240, 253, 244, 0.95)',
    controlsText: '#166534',
    shadowColor: 'rgba(34, 197, 94, 0.15)'
  },
  {
    id: 'ocean',
    name: 'Oceano Profundo',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
    nodeColors: [
      '#0ea5e9', '#0284c7', '#0369a1', '#075985',
      '#06b6d4', '#0891b2', '#0e7490', '#155e75',
      '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'
    ],
    connectionColor: '#0ea5e9',
    textColor: '#ffffff',
    selectedNodeBorder: '#0284c7',
    controlsBackground: 'rgba(240, 249, 255, 0.95)',
    controlsText: '#0c4a6e',
    shadowColor: 'rgba(14, 165, 233, 0.15)'
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol Mágico',
    background: 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%)',
    nodeColors: [
      '#ea580c', '#dc2626', '#be123c', '#a21caf',
      '#f59e0b', '#d97706', '#c2410c', '#b91c1c',
      '#7c3aed', '#9333ea', '#c026d3', '#db2777'
    ],
    connectionColor: '#f97316',
    textColor: '#ffffff',
    selectedNodeBorder: '#ea580c',
    controlsBackground: 'rgba(254, 247, 237, 0.95)',
    controlsText: '#9a3412',
    shadowColor: 'rgba(249, 115, 22, 0.15)'
  },
  {
    id: 'neon',
    name: 'Neon Cyberpunk',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    nodeColors: [
      '#00ffff', '#ff00ff', '#ffff00', '#00ff00',
      '#ff0080', '#8000ff', '#ff8000', '#0080ff',
      '#ff4080', '#40ff80', '#8040ff', '#ff8040'
    ],
    connectionColor: '#00ffff',
    textColor: '#ffffff',
    selectedNodeBorder: '#00ffff',
    controlsBackground: 'rgba(10, 10, 10, 0.9)',
    controlsText: '#00ffff',
    shadowColor: 'rgba(0, 255, 255, 0.3)'
  },
  {
    id: 'pastel',
    name: 'Pastel Dreamy',
    background: 'linear-gradient(135deg, #ffeef8 0%, #f0f4ff 50%, #f0fff4 100%)',
    nodeColors: [
      '#ffc1cc', '#ffb3d9', '#c1b3ff', '#b3d9ff',
      '#b3ffcc', '#ffffb3', '#ffccb3', '#d9b3ff',
      '#ccffb3', '#b3ffff', '#ffb3b3', '#b3ccff'
    ],
    connectionColor: '#d1a3ff',
    textColor: '#4a4a4a',
    selectedNodeBorder: '#ff9ec7',
    controlsBackground: 'rgba(255, 255, 255, 0.8)',
    controlsText: '#6b46c1',
    shadowColor: 'rgba(209, 163, 255, 0.2)'
  },
  {
    id: 'galaxy',
    name: 'Galáxia Infinita',
    background: 'linear-gradient(135deg, #0c0c0c 0%, #1a0033 25%, #330066 50%, #660099 75%, #9900cc 100%)',
    nodeColors: [
      '#9d4edd', '#c77dff', '#e0aaff', '#c8b2db',
      '#7209b7', '#a663cc', '#4c956c', '#61a5c2',
      '#f72585', '#b5179e', '#7209b7', '#480ca8'
    ],
    connectionColor: '#c77dff',
    textColor: '#ffffff',
    selectedNodeBorder: '#e0aaff',
    controlsBackground: 'rgba(12, 12, 12, 0.9)',
    controlsText: '#e0aaff',
    shadowColor: 'rgba(199, 125, 255, 0.4)'
  }
]

export const getThemeById = (themeId: string): MindMapTheme => {
  return mindMapThemes.find(theme => theme.id === themeId) || mindMapThemes[0]
}

export const getDefaultTheme = (): MindMapTheme => {
  return mindMapThemes[0]
}