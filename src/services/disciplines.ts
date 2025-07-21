/**
 * Serviço para gerenciamento de disciplinas
 */
import { PlanDiscipline, PlanSubject, Priority } from '@/lib/types/planning';

// Estrutura para disciplinas no formato da API
interface ApiDiscipline {
  id: number;
  name: string;
  subjects: {
    id: number;
    name: string;
    topics?: string[];
  }[];
}

// Disciplinas médicas pré-definidas para demonstração
const PREDEFINED_DISCIPLINES: ApiDiscipline[] = [
  {
    id: 1,
    name: 'Anatomia',
    subjects: [
      { id: 101, name: 'Sistema Cardiovascular', topics: ['Coração', 'Vasos sanguíneos', 'Circulação'] },
      { id: 102, name: 'Sistema Respiratório', topics: ['Pulmões', 'Vias aéreas', 'Mecânica respiratória'] },
      { id: 103, name: 'Sistema Nervoso', topics: ['Cérebro', 'Medula espinhal', 'Nervos periféricos'] },
      { id: 104, name: 'Sistema Digestório', topics: ['Esôfago', 'Estômago', 'Intestinos', 'Fígado'] },
      { id: 105, name: 'Sistema Músculo-esquelético', topics: ['Ossos', 'Músculos', 'Articulações'] }
    ]
  },
  {
    id: 2,
    name: 'Fisiologia',
    subjects: [
      { id: 201, name: 'Fisiologia Cardiovascular', topics: ['Ciclo cardíaco', 'Pressão arterial', 'Eletrofisiologia'] },
      { id: 202, name: 'Fisiologia Respiratória', topics: ['Ventilação', 'Difusão de gases', 'Transporte de oxigênio'] },
      { id: 203, name: 'Neurofisiologia', topics: ['Potencial de membrana', 'Sinapses', 'Reflexos'] },
      { id: 204, name: 'Fisiologia Renal', topics: ['Filtração glomerular', 'Reabsorção tubular', 'Equilíbrio ácido-base'] },
      { id: 205, name: 'Fisiologia Endócrina', topics: ['Hormônios', 'Feedback endócrino', 'Metabolismo'] }
    ]
  },
  {
    id: 3,
    name: 'Bioquímica',
    subjects: [
      { id: 301, name: 'Metabolismo de Carboidratos', topics: ['Glicólise', 'Ciclo de Krebs', 'Gliconeogênese'] },
      { id: 302, name: 'Metabolismo de Lipídios', topics: ['Beta-oxidação', 'Síntese de ácidos graxos', 'Colesterol'] },
      { id: 303, name: 'Metabolismo de Proteínas', topics: ['Aminoácidos', 'Ciclo da ureia', 'Síntese proteica'] },
      { id: 304, name: 'Enzimas e Cinética Enzimática', topics: ['Catálise enzimática', 'Cofatores', 'Inibição enzimática'] },
      { id: 305, name: 'Biologia Molecular', topics: ['DNA', 'RNA', 'Transcrição', 'Tradução'] }
    ]
  },
  {
    id: 4,
    name: 'Farmacologia',
    subjects: [
      { id: 401, name: 'Farmacocinética', topics: ['Absorção', 'Distribuição', 'Metabolismo', 'Excreção'] },
      { id: 402, name: 'Farmacodinâmica', topics: ['Receptores', 'Agonistas', 'Antagonistas', 'Eficácia'] },
      { id: 403, name: 'Farmacologia Cardiovascular', topics: ['Anti-hipertensivos', 'Antiarrítmicos', 'Anticoagulantes'] },
      { id: 404, name: 'Farmacologia do SNC', topics: ['Analgésicos', 'Ansiolíticos', 'Antidepressivos', 'Antiepilépticos'] },
      { id: 405, name: 'Antibióticos', topics: ['Beta-lactâmicos', 'Macrolídeos', 'Quinolonas', 'Aminoglicosídeos'] }
    ]
  },
  {
    id: 5,
    name: 'Patologia',
    subjects: [
      { id: 501, name: 'Patologia Celular', topics: ['Lesão celular', 'Adaptações celulares', 'Morte celular'] },
      { id: 502, name: 'Inflamação e Reparo', topics: ['Inflamação aguda', 'Inflamação crônica', 'Cicatrização'] },
      { id: 503, name: 'Patologia Cardiovascular', topics: ['Aterosclerose', 'Infarto do miocárdio', 'Insuficiência cardíaca'] },
      { id: 504, name: 'Patologia Pulmonar', topics: ['Pneumonia', 'DPOC', 'Câncer de pulmão'] },
      { id: 505, name: 'Neoplasias', topics: ['Oncogênese', 'Classificação de tumores', 'Metástases'] }
    ]
  },
  {
    id: 6,
    name: 'Microbiologia',
    subjects: [
      { id: 601, name: 'Bacteriologia', topics: ['Estrutura bacteriana', 'Gram-positivas', 'Gram-negativas'] },
      { id: 602, name: 'Virologia', topics: ['Estrutura viral', 'Replicação viral', 'Famílias virais'] },
      { id: 603, name: 'Micologia', topics: ['Fungos patogênicos', 'Micoses superficiais', 'Micoses sistêmicas'] },
      { id: 604, name: 'Parasitologia', topics: ['Protozoários', 'Helmintos', 'Ciclos de vida'] },
      { id: 605, name: 'Microbiologia Clínica', topics: ['Diagnóstico laboratorial', 'Resistência antimicrobiana'] }
    ]
  },
  {
    id: 7,
    name: 'Semiologia',
    subjects: [
      { id: 701, name: 'Anamnese', topics: ['História clínica', 'Queixa principal', 'História pregressa'] },
      { id: 702, name: 'Exame Físico Geral', topics: ['Sinais vitais', 'Estado geral', 'Pele e anexos'] },
      { id: 703, name: 'Exame Cardiovascular', topics: ['Ausculta cardíaca', 'Pulsos', 'Pressão arterial'] },
      { id: 704, name: 'Exame Respiratório', topics: ['Inspeção', 'Palpação', 'Percussão', 'Ausculta pulmonar'] },
      { id: 705, name: 'Exame Neurológico', topics: ['Consciência', 'Pares cranianos', 'Reflexos', 'Sensibilidade'] }
    ]
  },
  {
    id: 8,
    name: 'Clínica Médica',
    subjects: [
      { id: 801, name: 'Cardiologia', topics: ['Hipertensão', 'Insuficiência cardíaca', 'Arritmias'] },
      { id: 802, name: 'Pneumologia', topics: ['Asma', 'DPOC', 'Pneumonias'] },
      { id: 803, name: 'Gastroenterologia', topics: ['Doença do refluxo', 'Úlcera péptica', 'Hepatites'] },
      { id: 804, name: 'Endocrinologia', topics: ['Diabetes', 'Distúrbios da tireoide', 'Obesidade'] },
      { id: 805, name: 'Nefrologia', topics: ['Insuficiência renal', 'Glomerulonefrites', 'Infecção urinária'] }
    ]
  }
];

/**
 * Obtém lista de todas as disciplinas disponíveis
 * @returns Array de disciplinas da API
 */
export const getDisciplines = async (): Promise<ApiDiscipline[]> => {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Buscar disciplinas cadastradas pelo usuário no localStorage
    const storedDisciplinas = localStorage.getItem('disciplinas');
    let userDisciplines: ApiDiscipline[] = [];
    
    if (storedDisciplinas) {
      // Converter as disciplinas do usuário para o formato ApiDiscipline
      const parsedDisciplinas = JSON.parse(storedDisciplinas);
      userDisciplines = parsedDisciplinas.map((d: any) => ({
        id: d.id,
        name: d.nome,
        subjects: d.assuntos.map((a: any) => ({
          id: a.id,
          name: a.nome,
          topics: []
        }))
      }));
    }
    
    // Combinar disciplinas predefinidas com as disciplinas do usuário
    return [...PREDEFINED_DISCIPLINES, ...userDisciplines];
  } catch (error) {
    console.error('Erro ao buscar disciplinas do usuário:', error);
    // Em caso de erro, retornar apenas as disciplinas predefinidas
    return PREDEFINED_DISCIPLINES;
  }
};

/**
 * Obtém detalhes de uma disciplina específica
 * @param id ID da disciplina
 * @returns Disciplina ou null se não for encontrada
 */
export const getDisciplineById = async (id: number): Promise<ApiDiscipline | null> => {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Verificar nas disciplinas predefinidas
    const predefinedDiscipline = PREDEFINED_DISCIPLINES.find(d => d.id === id);
    if (predefinedDiscipline) {
      return predefinedDiscipline;
    }
    
    // Verificar nas disciplinas cadastradas pelo usuário
    const storedDisciplinas = localStorage.getItem('disciplinas');
    if (storedDisciplinas) {
      const parsedDisciplinas = JSON.parse(storedDisciplinas);
      const userDiscipline = parsedDisciplinas.find((d: any) => d.id === id);
      
      if (userDiscipline) {
        // Converter para o formato ApiDiscipline
        return {
          id: userDiscipline.id,
          name: userDiscipline.nome,
          subjects: userDiscipline.assuntos.map((a: any) => ({
            id: a.id,
            name: a.nome,
            topics: []
          }))
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar disciplina do usuário:', error);
    // Em caso de erro, continuar com a busca nas disciplinas predefinidas
    return PREDEFINED_DISCIPLINES.find(d => d.id === id) || null;
  }
};

/**
 * Converte disciplinas da API para o formato usado no planejamento
 * @param disciplines Disciplinas da API para converter
 * @returns Disciplinas no formato do planejamento
 */
export const convertToPlanDisciplines = (
  disciplines: ApiDiscipline[],
  selectedSubjects?: Record<number, number[]> // disciplineId -> [subjectIds]
): PlanDiscipline[] => {
  return disciplines.map(apiDiscipline => {
    // Identificar os assuntos selecionados para esta disciplina
    const selectedSubjectIds = selectedSubjects?.[apiDiscipline.id] || [];
    
    // Filtrar e converter assuntos se houver seleção, ou incluir todos com defaults
    const subjects: PlanSubject[] = (selectedSubjectIds.length > 0 
      ? apiDiscipline.subjects.filter(s => selectedSubjectIds.includes(s.id))
      : apiDiscipline.subjects
    ).map(apiSubject => ({
      id: apiSubject.id,
      name: apiSubject.name,
      hours: 4, // Valor padrão
      priority: 'média' as Priority,
      completed: false,
      progress: 0
    }));
    
    return {
      id: apiDiscipline.id,
      name: apiDiscipline.name,
      priority: 'média' as Priority,
      subjects
    };
  });
};

/**
 * Obtém assuntos de uma disciplina específica
 * @param disciplineId ID da disciplina
 * @returns Assuntos da disciplina ou array vazio
 */
export const getSubjectsByDisciplineId = async (disciplineId: number): Promise<{id: number, name: string}[]> => {
  // Buscar a disciplina completa
  const discipline = await getDisciplineById(disciplineId);
  if (!discipline) return [];
  
  // Retornar seus assuntos
  return discipline.subjects.map(s => ({
    id: s.id,
    name: s.name
  }));
};

/**
 * Verifica se uma disciplina é definida pelo usuário (personalizada)
 * @param id ID da disciplina
 * @returns True se for uma disciplina do usuário, false se for predefinida
 */
export const isUserDiscipline = (id: number): boolean => {
  // Disciplinas com ID > 8 são consideradas definidas pelo usuário
  return id > 8;
};

/**
 * Obtém o nome de uma disciplina, seja ela predefinida ou do usuário
 * @param id ID da disciplina
 * @returns Nome da disciplina ou null se não encontrada
 */
export const getDisciplineName = (id: number): string | null => {
  // Verificar se é uma disciplina predefinida
  if (!isUserDiscipline(id)) {
    const predefined = PREDEFINED_DISCIPLINES.find(d => d.id === id);
    return predefined?.name || null;
  }
  
  // Verificar nas disciplinas do usuário
  try {
    const storedDisciplinas = localStorage.getItem('disciplinas');
    if (storedDisciplinas) {
      const parsedDisciplinas = JSON.parse(storedDisciplinas);
      const userDiscipline = parsedDisciplinas.find((d: any) => d.id === id);
      return userDiscipline?.nome || null;
    }
  } catch (error) {
    console.error('Erro ao buscar nome da disciplina:', error);
  }
  
  return null;
};

/**
 * Obtém o nome de um assunto, seja de disciplina predefinida ou do usuário
 * @param disciplineId ID da disciplina
 * @param subjectId ID do assunto
 * @returns Nome do assunto ou null se não encontrado
 */
export const getSubjectName = (disciplineId: number, subjectId: number): string | null => {
  // Verificar se é uma disciplina predefinida
  if (!isUserDiscipline(disciplineId)) {
    const discipline = PREDEFINED_DISCIPLINES.find(d => d.id === disciplineId);
    const subject = discipline?.subjects.find(s => s.id === subjectId);
    return subject?.name || null;
  }
  
  // Verificar nas disciplinas do usuário
  try {
    const storedDisciplinas = localStorage.getItem('disciplinas');
    if (storedDisciplinas) {
      const parsedDisciplinas = JSON.parse(storedDisciplinas);
      const userDiscipline = parsedDisciplinas.find((d: any) => d.id === disciplineId);
      const userSubject = userDiscipline?.assuntos?.find((a: any) => a.id === subjectId);
      return userSubject?.nome || null;
    }
  } catch (error) {
    console.error('Erro ao buscar nome do assunto:', error);
  }
  
  return null;
}; 