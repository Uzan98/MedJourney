export enum PostType {
  REGULAR = 'regular',
  ACHIEVEMENT = 'achievement',
  STUDY_SESSION = 'study_session',
  QUESTION = 'question',
  MATERIAL = 'material',
  ACADEMIC_EVENT = 'academic_event',
  GRADE_ATTENDANCE = 'grade_attendance',
  EXAM_RESULT = 'exam_result',
  NOTE = 'note',
  GENERAL = 'general',
  ANNOUNCEMENT = 'announcement',
  QUESTION_FORUM = 'question_forum'
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

export interface AcademicEventData {
  event_id: string;
  event_title: string;
  event_date: string;
  event_time?: string;
  location?: string;
  description?: string;
  event_type: 'lecture' | 'exam' | 'assignment' | 'workshop' | 'other';
}

export interface QuestionForumData {
  question_title: string;
  subject_id?: string;
  subject_name?: string;
  topic?: string;
  is_solved: boolean;
  answer_count: number;
  best_answer_id?: string;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  type: PostType;
  metadata?: ExamResultData | AchievementData | StudyMilestoneData | AcademicEventData | QuestionForumData | any;
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

export interface AcademicEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  type: 'lecture' | 'exam' | 'assignment' | 'workshop' | 'other';
  course_id?: string;
  course_name?: string;
  importance: 'low' | 'medium' | 'high';
}

export interface GradeAttendanceData {
  disciplineId: string;
  disciplineName: string;
  professorName?: string;
  grades: {
    evaluationName: string;
    grade: number;
    maxGrade: number;
    date: string;
    weight?: number;
  }[];
  attendance: {
    totalClasses: number;
    attendedClasses: number;
    absences: number;
    attendancePercentage: number;
    absencesAllowed: number;
  };
  averageGrade?: number;
  status?: 'approved' | 'at_risk' | 'failed';
} 

export interface FacultyEvent {
  id: number;
  faculty_id: number;
  creator_id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  color?: string;
  type: 'exam' | 'assignment' | 'lecture' | 'meeting' | 'other';
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
} 