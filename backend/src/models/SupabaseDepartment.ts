// Supabase-compatible Department interface
export interface IDepartment {
  id: string;
  name: string;
  type?: string;
  team_lead_id?: string; // UUID of the team lead employee
  created_at: string | Date;
  updated_at: string | Date;
}

// Request/Response interfaces
export interface CreateDepartmentRequest {
  name: string;
  type?: string;
  teamLeadId?: string;
  team_lead_id?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  type?: string;
  teamLeadId?: string;
  team_lead_id?: string;
}

export interface DepartmentQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}

// Response interface (camelCase for frontend)
export interface DepartmentResponse {
  id: string;
  name: string;
  type?: string;
  teamLeadId?: string;
  createdAt: string;
  updatedAt: string;
}