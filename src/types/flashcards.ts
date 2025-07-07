export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  last_reviewed?: string;
  next_review?: string;
  review_count: number;
  mastery_level: number; // 0-100%
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Deck {
  id: string;
  deck_id?: string;
  name: string;
  description: string;
  cover_color?: string;
  cover_image?: string;
  card_count?: number;
  mastery_percentage?: number;
  cards_to_review?: number;
  discipline_id?: string;
  subject_id?: string;
  tags?: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  discipline_name?: string;
  subject_name?: string;
  user_id: string;
  mastery_average?: number;
  mastery_level?: number | string; // Nível de domínio do deck (0-100%)
  study_count?: number;
  last_studied?: string; // Data do último estudo
}

export interface StudySession {
  id: string;
  user_id: string;
  deck_id: string;
  start_time: string;
  end_time?: string;
  cards_studied?: number;
  cards_mastered?: number;
  duration_seconds?: number;
  algorithm?: StudyAlgorithm;
  status?: 'in_progress' | 'completed';
  is_custom_study?: boolean;
}

export interface CardReview {
  id?: string;
  user_id: string;
  card_id: string;
  session_id: string;
  result: string;
  response_time_ms: number;
  previous_mastery: number;
  new_mastery: number;
  created_at?: string;
  is_custom_study?: boolean;
}

export interface FlashcardStats {
  total_cards: number;
  mastered_cards: number;
  cards_to_review: number;
  mastery_percentage: number;
  total_study_sessions: number;
  total_study_time_minutes: number;
  study_streak_days: number;
}

export enum StudyAlgorithm {
  SPACED_REPETITION = 'spaced_repetition',
  LEITNER = 'leitner',
  DIFFICULT_FIRST = 'difficult_first',
  RANDOM = 'random'
}

export interface StudySettings {
  algorithm: StudyAlgorithm;
  cards_per_session: number;
  include_mastered: boolean;
  prioritize_due_cards: boolean;
  review_new_cards_same_day: boolean;
} 