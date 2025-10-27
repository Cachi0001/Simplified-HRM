// Supabase-compatible GroupChat interface
export interface IGroupChat {
  id: string;
  name: string;
  created_by: string; // UUID of the user who created the group
  created_at: string | Date;
}

// Request/Response interfaces
export interface CreateGroupChatRequest {
  name: string;
  createdBy?: string;
  created_by?: string;
}

export interface GroupChatQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// Response interface (camelCase for frontend)
export interface GroupChatResponse {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}