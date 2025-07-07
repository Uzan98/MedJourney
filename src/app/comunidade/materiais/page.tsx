'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpenCheck, 
  Search, 
  Filter, 
  FileText, 
  Download,
  FileImage,
  FileVideo,
  FilePlus2,
  Bookmark,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Dados simulados para materiais
const mockMaterials = [
  {
    id: '1',
    title: 'Apostila de Anatomia - Sistema Nervoso',
    description: 'Material completo sobre o sistema nervoso central e periférico',
    type: 'pdf',
    subject: 'Anatomia Humana',
    author: 'Prof. Ricardo Almeida',
    uploadDate: '2023-04-15',
    downloadCount: 145,
    fileSize: '3.2 MB'
  },
  {
    id: '2',
    title: 'Slides - Fisiologia Cardiovascular',
    description: 'Slides da aula sobre sistema cardiovascular',
    type: 'ppt',
    subject: 'Fisiologia Médica',
    author: 'Profa. Mariana Santos',
    uploadDate: '2023-04-22',
    downloadCount: 98,
    fileSize: '5.7 MB'
  },
  {
    id: '3',
    title: 'Vídeo - Técnicas de Ausculta Cardíaca',
    description: 'Demonstração prática das técnicas de ausculta cardíaca',
    type: 'video',
    subject: 'Semiologia Médica',
    author: 'Prof. Carlos Mendes',
    uploadDate: '2023-05-03',
    downloadCount: 76,
    fileSize: '120 MB'
  },
  {
    id: '4',
    title: 'Resumo - Farmacologia dos Antibióticos',
    description: 'Resumo completo sobre os principais antibióticos e seus mecanismos de ação',
    type: 'pdf',
    subject: 'Farmacologia',
    author: 'Prof. André Silva',
    uploadDate: '2023-05-10',
    downloadCount: 112,
    fileSize: '1.8 MB'
  },
  {
    id: '5',
    title: 'Atlas de Histologia - Tecido Epitelial',
    description: 'Imagens de alta resolução de lâminas histológicas de tecido epitelial',
    type: 'image',
    subject: 'Histologia',
    author: 'Profa. Luciana Costa',
    uploadDate: '2023-04-28',
    downloadCount: 89,
    fileSize: '45 MB'
  }
];

export default function MateriaisPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState(mockMaterials);
  const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'slides' | 'videos' | 'images'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Simular carregamento
    setLoading(true);
    setTimeout(() => {
      filterMaterials();
      setLoading(false);
    }, 500);
  }, [activeTab]);
  
  const filterMaterials = () => {
    if (activeTab === 'all') {
      setMaterials(mockMaterials);
    } else {
      let filteredMaterials = [...mockMaterials];
      
      if (activeTab === 'documents') {
        filteredMaterials = mockMaterials.filter(m => m.type === 'pdf');
      } else if (activeTab === 'slides') {
        filteredMaterials = mockMaterials.filter(m => m.type === 'ppt');
      } else if (activeTab === 'videos') {
        filteredMaterials = mockMaterials.filter(m => m.type === 'video');
      } else if (activeTab === 'images') {
        filteredMaterials = mockMaterials.filter(m => m.type === 'image');
      }
      
      setMaterials(filteredMaterials);
    }
  };
  
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      filterMaterials();
      return;
    }
    
    const filtered = mockMaterials.filter(material => 
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setMaterials(filtered);
  };
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-10 w-10 text-red-500" />;
      case 'ppt':
        return <FileText className="h-10 w-10 text-orange-500" />;
      case 'video':
        return <FileVideo className="h-10 w-10 text-blue-500" />;
      case 'image':
        return <FileImage className="h-10 w-10 text-green-500" />;
      default:
        return <FileText className="h-10 w-10 text-gray-500" />;
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <BookOpenCheck className="h-6 w-6 mr-2 text-blue-600" />
          Materiais de Estudo
        </h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <FilePlus2 className="h-4 w-4 mr-2" />
          Enviar Material
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Buscar materiais..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleSearch}
          >
            Buscar
          </Button>
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs 
          defaultValue="all" 
          className="w-full"
          onValueChange={(value) => setActiveTab(value as 'all' | 'documents' | 'slides' | 'videos' | 'images')}
        >
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="slides">Slides</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Carregando materiais...</p>
          </div>
        ) : materials.length > 0 ? (
          <div className="space-y-4">
            {materials.map((material) => (
              <Link 
                key={material.id} 
                href={`/comunidade/materiais/${material.id}`} 
                className="block"
              >
                <div className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-gray-50 rounded-lg">
                      {getFileIcon(material.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-lg text-gray-800">
                          {material.title}
                        </h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Bookmark className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-1">
                        {material.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {material.subject}
                        </span>
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          {material.type.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-gray-500">
                          Por: {material.author} • {material.fileSize}
                        </div>
                        
                        <div className="flex items-center">
                          <Download className="h-4 w-4 mr-1 text-gray-500" />
                          <span className="text-gray-500 mr-2">{material.downloadCount}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum material encontrado</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Nenhum material corresponde à sua busca. Tente outros termos.'
                : 'Não há materiais disponíveis nesta categoria no momento.'}
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <FilePlus2 className="h-4 w-4 mr-2" />
              Enviar Material
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 