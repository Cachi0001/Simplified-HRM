"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseEmployeeRepository = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseEmployeeRepository {
    supabaseAdmin;
    constructor() {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
        }
        this.supabaseAdmin = (0, supabase_js_1.createClient)(url, serviceKey);
    }
    async create(employeeData, userId) {
        try {
            logger_1.default.info('Creating employee', { email: employeeData.email, userId });
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .insert({
                user_id: userId,
                email: employeeData.email,
                full_name: employeeData.fullName,
                role: employeeData.role,
                department: employeeData.department,
                position: employeeData.position,
                phone: employeeData.phone,
                address: employeeData.address,
                date_of_birth: employeeData.dateOfBirth?.toISOString(),
                hire_date: employeeData.hireDate?.toISOString(),
                profile_picture: employeeData.profilePicture,
                status: 'active'
            })
                .select()
                .single();
            if (error) {
                logger_1.default.error('Employee creation error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseEmployeeToEmployee(data);
        }
        catch (error) {
            logger_1.default.error('Employee creation failed', { error: error.message });
            throw error;
        }
    }
    async findAll(query) {
        try {
            const page = query?.page || 1;
            const limit = query?.limit || 10;
            const offset = (page - 1) * limit;
            let supabaseQuery = this.supabaseAdmin.from('employees').select('*', { count: 'exact' });
            // Apply filters
            if (query?.search) {
                supabaseQuery = supabaseQuery.or(`full_name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
            }
            if (query?.department) {
                supabaseQuery = supabaseQuery.eq('department', query.department);
            }
            if (query?.status) {
                supabaseQuery = supabaseQuery.eq('status', query.status);
            }
            if (query?.role) {
                supabaseQuery = supabaseQuery.eq('role', query.role);
            }
            const { data, error, count } = await supabaseQuery
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                logger_1.default.error('Find employees error', { error: error.message });
                throw new Error(error.message);
            }
            return {
                employees: data.map(this.mapSupabaseEmployeeToEmployee),
                total: count || 0,
                page,
                limit
            };
        }
        catch (error) {
            logger_1.default.error('Find employees failed', { error: error.message });
            throw error;
        }
    }
    async findById(id) {
        try {
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                logger_1.default.error('Find employee by ID error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseEmployeeToEmployee(data);
        }
        catch (error) {
            logger_1.default.error('Find employee by ID failed', { error: error.message });
            throw error;
        }
    }
    async findByUserId(userId) {
        try {
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                logger_1.default.error('Find employee by user ID error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseEmployeeToEmployee(data);
        }
        catch (error) {
            logger_1.default.error('Find employee by user ID failed', { error: error.message });
            throw error;
        }
    }
    async update(id, employeeData) {
        try {
            logger_1.default.info('Updating employee', { id });
            const updateData = {};
            if (employeeData.fullName !== undefined)
                updateData.full_name = employeeData.fullName;
            if (employeeData.department !== undefined)
                updateData.department = employeeData.department;
            if (employeeData.position !== undefined)
                updateData.position = employeeData.position;
            if (employeeData.phone !== undefined)
                updateData.phone = employeeData.phone;
            if (employeeData.address !== undefined)
                updateData.address = employeeData.address;
            if (employeeData.dateOfBirth !== undefined)
                updateData.date_of_birth = employeeData.dateOfBirth?.toISOString();
            if (employeeData.hireDate !== undefined)
                updateData.hire_date = employeeData.hireDate?.toISOString();
            if (employeeData.profilePicture !== undefined)
                updateData.profile_picture = employeeData.profilePicture;
            if (employeeData.status !== undefined)
                updateData.status = employeeData.status;
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                logger_1.default.error('Employee update error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseEmployeeToEmployee(data);
        }
        catch (error) {
            logger_1.default.error('Employee update failed', { error: error.message });
            throw error;
        }
    }
    async delete(id) {
        try {
            const { error } = await this.supabaseAdmin
                .from('employees')
                .delete()
                .eq('id', id);
            if (error) {
                logger_1.default.error('Employee deletion error', { error: error.message });
                throw new Error(error.message);
            }
        }
        catch (error) {
            logger_1.default.error('Employee deletion failed', { error: error.message });
            throw error;
        }
    }
    async search(query) {
        try {
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .select('*')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`)
                .eq('status', 'active')
                .limit(20);
            if (error) {
                logger_1.default.error('Employee search error', { error: error.message });
                throw new Error(error.message);
            }
            return data.map(this.mapSupabaseEmployeeToEmployee);
        }
        catch (error) {
            logger_1.default.error('Employee search failed', { error: error.message });
            throw error;
        }
    }
    mapSupabaseEmployeeToEmployee(data) {
        return {
            id: data.id,
            userId: data.user_id,
            email: data.email,
            fullName: data.full_name,
            role: data.role,
            department: data.department,
            position: data.position,
            emailVerified: data.email_verified !== null ? data.email_verified : false,
            phone: data.phone,
            address: data.address,
            dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
            hireDate: data.hire_date ? new Date(data.hire_date) : undefined,
            profilePicture: data.profile_picture,
            status: data.status,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
    async getPendingApprovals() {
        try {
            const { data, error } = await this.supabaseAdmin
                .from('employees')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.default.error('Get pending approvals error', { error: error.message });
                throw new Error(error.message);
            }
            return data.map(this.mapSupabaseEmployeeToEmployee);
        }
        catch (error) {
            logger_1.default.error('Get pending approvals failed', { error: error.message });
            throw error;
        }
    }
    async approve(id) {
        const { data, error } = await this.supabaseAdmin
            .from('employees')
            .update({ status: 'active' })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async getPending() {
        const { data, error } = await this.supabaseAdmin
            .from('employees')
            .select('*')
            .eq('status', 'pending');
        if (error)
            throw new Error(error.message);
        return data;
    }
}
exports.SupabaseEmployeeRepository = SupabaseEmployeeRepository;
//# sourceMappingURL=SupabaseEmployeeRepository.js.map