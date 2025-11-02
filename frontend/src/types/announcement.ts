export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  author_id: string;
  author_name?: string;
  author_email?: string;
  scheduled_at?: string;
  published_at?: string;
  expires_at?: string;
  target_type: 'all' | 'departments' | 'roles' | 'users';
  target_ids: string[];
  template_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Additional fields for frontend
  is_read?: boolean;
  read_count?: number;
  reaction_counts?: {
    like?: number;
    love?: number;
    laugh?: number;
    wow?: number;
    sad?: number;
    angry?: number;
    acknowledge?: number;
  };
  user_reaction?: string;
}

export interface AnnouncementTemplate {
  id: string;
  name: string;
  title_template: string;
  content_template: string;
  default_priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementReaction {
  id: string;
  announcement_id: string;
  user_id: string;
  reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'acknowledge';
  created_at: string;
}

export interface AnnouncementReadStatus {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_at?: Date;
  expires_at?: Date;
  target_type?: 'all' | 'departments' | 'roles' | 'users';
  target_ids?: string[];
  template_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  scheduled_at?: Date;
  expires_at?: Date;
  target_type?: 'all' | 'departments' | 'roles' | 'users';
  target_ids?: string[];
  metadata?: Record<string, any>;
}

export interface AnnouncementFilters {
  status?: string[];
  priority?: string[];
  author_id?: string;
  target_type?: string;
  from_date?: Date;
  to_date?: Date;
  search?: string;
}

export interface AnnouncementStats {
  total_announcements: number;
  published_announcements: number;
  scheduled_announcements: number;
  expired_announcements: number;
  total_reactions: number;
  total_reads: number;
  read_percentage: number;
}

export interface CreateTemplateRequest {
  name: string;
  title_template: string;
  content_template: string;
  default_priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
}