// Re-exportando os tipos do questions-bank.service.ts para manter compatibilidade
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';

// Alias para manter compatibilidade com código existente
export type Questao = Question;
export type Alternativa = AnswerOption;
export type BancoQuestoes = Question[];
export type BancoQuestoesService = typeof QuestionsBankService;

// Tipos enumerados específicos do domínio
export type TipoQuestao = 'multiple_choice' | 'true_false' | 'essay';
export type Dificuldade = 'baixa' | 'média' | 'alta';

// Re-exportação para retrocompatibilidade
export type { Question, AnswerOption }; 
export { QuestionsBankService }; 