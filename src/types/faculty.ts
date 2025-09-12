// Tipos para o recurso "Minha Faculdade"

export interface Faculty {
  id: number;
  name: string;
  description: string;
  institution?: string;
  course?: string;
  semester?: string;
  is_public: boolean;
  code: string;
  owner_id: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface FacultyUser {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export interface FacultyMember {
  id?: number;
  faculty_id: number;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  user?: FacultyUser;
}

export interface FacultyPost {
  id: number;
  faculty_id: number;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: FacultyUser;
  comment_count?: number;
  // Novas propriedades
  type?: string;
  attachment_url?: string;
  attachment_type?: string;
  likes_count?: number;
  user_liked?: boolean;
}

export interface FacultyComment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: FacultyUser;
}

export interface FacultyMaterial {
  id: number;
  faculty_id: number;
  user_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  periodo?: number;
  disciplina?: string;
  created_at: string;
  download_count?: number;
  user?: FacultyUser;
}

export interface FacultyExam {
  id: number;
  faculty_id: number;
  creator_id: string;
  title: string;
  description: string;
  scheduled_date?: string;
  duration_minutes?: number;
  max_score?: number;
  is_published?: boolean;
  external_exam_id?: number; // ID do simulado original
  category?: string;
  disciplina?: string;
  periodo?: number;
  created_at: string;
  updated_at?: string;
  user?: FacultyUser;
}

export interface FacultyBannedUser {
  id: number;
  faculty_id: number;
  user_id: string;
  banned_by: string;
  banned_at: string;
  reason?: string;
  is_active: boolean;
  unbanned_at?: string;
  unbanned_by?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  banned_by_user?: {
    id: string;
    name?: string;
    email?: string;
  };
  unbanned_by_user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface FacultyJoinRequest {
  id: number;
  faculty_id: number;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  reviewed_by_user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

// Interfaces para o Fórum de Dúvidas
export interface ForumTag {
  id: number;
  faculty_id: number;
  name: string;
  color: string;
  created_at: string;
  topic_count?: number;
}

export interface ForumTopic {
  id: number;
  faculty_id: number;
  user_id: string;
  title: string;
  content: string;
  is_resolved: boolean;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  user?: FacultyUser;
  replies_count: number;
  votes_count: number;
  tags: ForumTag[];
  user_vote?: number; // 1 para upvote, -1 para downvote, undefined se não votou
}

export interface ForumReply {
  id: number;
  topic_id: number;
  user_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  user?: FacultyUser;
  votes_count: number;
  user_vote?: number; // 1 para upvote, -1 para downvote, undefined se não votou
}