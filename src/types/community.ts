export enum PostType {
  ACHIEVEMENT = 'achievement',
  EXAM_RESULT = 'exam_result',
  STUDY_MILESTONE = 'study_milestone',
  NOTE = 'note',
  QUESTION = 'question',
  GENERAL = 'general'
}

export enum ReactionType {
  LIKE = 'like',
  CELEBRATE = 'celebrate',
  INSIGHTFUL = 'insightful',
  HELPFUL = 'helpful'
}

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface PostAttachment {
  id: string;
  post_id: string;
  url: string;
  type: 'image' | 'pdf' | 'link';
  title?: string;
  thumbnail_url?: string;
}

export interface ExamResultData {
  exam_id: string;
  exam_title: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number; // em segundos
}

export interface AchievementData {
  achievement_id: string;
  achievement_type: string;
  achievement_title: string;
  description: string;
  icon?: string;
}

export interface StudyMilestoneData {
  milestone_type: 'streak' | 'time' | 'sessions';
  value: number;
  discipline_id?: string;
  discipline_name?: string;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  type: PostType;
  metadata?: ExamResultData | AchievementData | StudyMilestoneData | any;
  visibility: 'public' | 'followers' | 'private';
  attachments?: PostAttachment[];
  reactions_count: {
    like: number;
    celebrate: number;
    insightful: number;
    helpful: number;
  };
  comments_count: number;
  created_at: string;
  updated_at?: string;
  group_id?: string;
  discipline_id?: string;
}

export interface CommunityFeedFilters {
  type?: PostType[];
  user_id?: string;
  group_id?: string;
  discipline_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
} 