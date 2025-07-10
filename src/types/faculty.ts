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
  created_at: string;
  user?: FacultyUser;
}

export interface FacultyExam {
  id: number;
  faculty_id: number;
  user_id: string;
  title: string;
  description: string;
  exam_date: string;
  file_url?: string;
  created_at: string;
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