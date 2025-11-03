import { 
  Announcement, 
  AnnouncementTemplate, 
  CreateAnnouncementRequest, 
  UpdateAnnouncementRequest, 
  AnnouncementFilters,
  AnnouncementStats,
  CreateTemplateRequest
} from '../types/announcement';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class AnnouncementService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Handle different response structures from backend
    return data.data?.announcement || data.data || data.announcement || data;
  }

  // Announcement CRUD operations
  async getAnnouncements(filters: AnnouncementFilters = {}, limit = 50, offset = 0): Promise<Announcement[]> {
    const params = new URLSearchParams();
    
    if (filters.status?.length) params.append('status', filters.status.join(','));
    if (filters.priority?.length) params.append('priority', filters.priority.join(','));
    if (filters.author_id) params.append('author_id', filters.author_id);
    if (filters.target_type) params.append('target_type', filters.target_type);
    if (filters.from_date) params.append('from_date', filters.from_date.toISOString());
    if (filters.to_date) params.append('to_date', filters.to_date.toISOString());
    if (filters.search) params.append('search', filters.search);
    
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return this.request<Announcement[]>(`/announcements?${params.toString()}`);
  }

  async getAnnouncementById(id: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}`);
  }

  async createAnnouncement(data: CreateAnnouncementRequest): Promise<Announcement> {
    return this.request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(id: string, data: UpdateAnnouncementRequest): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.request(`/announcements/${id}`, {
      method: 'DELETE',
    });
  }

  async publishAnnouncement(id: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}/publish`, {
      method: 'POST',
    });
  }

  // Reaction operations
  async addReaction(announcementId: string, reactionType: string): Promise<any> {
    return this.request(`/announcements/${announcementId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
  }

  async removeReaction(announcementId: string): Promise<void> {
    await this.request(`/announcements/${announcementId}/reactions`, {
      method: 'DELETE',
    });
  }

  async getReactions(announcementId: string): Promise<any> {
    return this.request(`/announcements/${announcementId}/reactions`);
  }

  // Read status
  async markAsRead(announcementId: string): Promise<void> {
    await this.request(`/announcements/${announcementId}/read`, {
      method: 'POST',
    });
  }

  // Statistics
  async getAnnouncementStats(announcementId: string): Promise<AnnouncementStats> {
    return this.request<AnnouncementStats>(`/announcements/${announcementId}/stats`);
  }

  // Template operations
  async getTemplates(): Promise<AnnouncementTemplate[]> {
    return this.request<AnnouncementTemplate[]>('/announcements/templates');
  }

  async createTemplate(data: CreateTemplateRequest): Promise<AnnouncementTemplate> {
    return this.request<AnnouncementTemplate>('/announcements/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const announcementService = new AnnouncementService();
export default announcementService;