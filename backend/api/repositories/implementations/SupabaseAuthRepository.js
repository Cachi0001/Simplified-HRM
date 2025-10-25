"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthRepository = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("../../utils/logger"));
class SupabaseAuthRepository {
    _supabase;
    _supabaseAdmin;
    constructor() {
        const url = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !anonKey || !serviceKey) {
            throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set');
        }
        this._supabase = (0, supabase_js_1.createClient)(url, anonKey);
        this._supabaseAdmin = (0, supabase_js_1.createClient)(url, serviceKey);
    }
    get supabase() {
        return this._supabase;
    }
    get supabaseAdmin() {
        return this._supabaseAdmin;
    }
    // ———————————————————— SIGN UP ————————————————————
    async signUp(userData) {
        try {
            logger_1.default.info('Signing up user', { email: userData.email });
            // 1. Admin list – see if email already exists
            const { data: { users } } = await this.supabaseAdmin.auth.admin.listUsers();
            const existing = users.find(u => u.email === userData.email);
            if (existing) {
                // 2. Already confirmed → block duplicate
                if (existing.email_confirmed_at) {
                    throw new Error('Email already registered');
                }
                // 3. Not confirmed → resend confirmation email
                const { error } = await this.supabase.auth.resend({
                    type: 'signup',
                    email: userData.email,
                    options: {
                        emailRedirectTo: 'http://localhost:3000/confirm',
                    },
                });
                if (error)
                    throw error;
                // Return a helpful message (no token – user must click link)
                throw new Error('Check your inbox – we sent you a new confirmation email');
            }
            // 4. New user – normal signup
            const { data, error } = await this.supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    emailRedirectTo: 'http://localhost:3000/confirm',
                    data: {
                        full_name: userData.fullName,
                        role: userData.role || 'employee',
                    },
                },
            });
            if (error)
                throw error;
            if (!data.user)
                throw new Error('Signup failed');
            const user = {
                id: data.user.id,
                email: data.user.email,
                fullName: userData.fullName,
                role: userData.role || 'employee',
                emailVerified: false,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at),
            };
            return { user, accessToken: '', refreshToken: '' };
        }
        catch (error) {
            logger_1.default.error('Signup failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— SIGN IN ————————————————————
    async signIn(credentials) {
        try {
            logger_1.default.info('Signing in user', { email: credentials.email });
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });
            if (error) {
                // Handle specific Supabase errors with better messages
                if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
                }
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password');
                }
                throw new Error(error.message);
            }
            if (!data.user || !data.session)
                throw new Error('Authentication failed');
            const { data: employee, error: empError } = await this.supabaseAdmin
                .from('employees')
                .select('id, full_name, role, status')
                .eq('user_id', data.user.id)
                .single();
            if (empError || !employee)
                throw new Error('Employee record not found');
            if (employee.status !== 'active')
                throw new Error('Account pending admin approval');
            const user = {
                id: data.user.id,
                email: data.user.email,
                fullName: employee.full_name,
                role: employee.role,
                emailVerified: !!data.user.email_confirmed_at,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at),
            };
            return {
                user,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
            };
        }
        catch (error) {
            logger_1.default.error('Signin failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— OAUTH ————————————————————
    async signInWithOAuth(provider, idToken) {
        try {
            logger_1.default.info('Signing in with OAuth', { provider });
            const { data, error } = await this.supabase.auth.signInWithIdToken({
                provider: provider,
                token: idToken || '',
            });
            if (error)
                throw new Error(error.message);
            if (!data.user || !data.session)
                throw new Error('OAuth authentication failed');
            const { data: employee, error: empError } = await this.supabaseAdmin
                .from('employees')
                .select('id, full_name, role, status')
                .eq('user_id', data.user.id)
                .single();
            if (empError || !employee)
                throw new Error('Employee record not found');
            if (employee.status !== 'active')
                throw new Error('Account pending admin approval');
            const user = {
                id: data.user.id,
                email: data.user.email,
                fullName: employee.full_name,
                role: employee.role,
                emailVerified: !!data.user.email_confirmed_at,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at),
            };
            return {
                user,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
            };
        }
        catch (error) {
            logger_1.default.error('OAuth signin failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— REFRESH TOKEN ————————————————————
    async refreshToken(refreshToken) {
        try {
            const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken });
            if (error)
                throw new Error(error.message);
            if (!data.user || !data.session)
                throw new Error('Token refresh failed');
            const { data: employee } = await this.supabaseAdmin
                .from('employees')
                .select('id, full_name, role, status')
                .eq('user_id', data.user.id)
                .single();
            if (!employee)
                throw new Error('Employee record not found');
            const user = {
                id: data.user.id,
                email: data.user.email,
                fullName: employee.full_name,
                role: employee.role,
                emailVerified: !!data.user.email_confirmed_at,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at),
            };
            return {
                user,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
            };
        }
        catch (error) {
            logger_1.default.error('Token refresh failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— GET CURRENT USER ————————————————————
    async getCurrentUser(accessToken) {
        try {
            const { data, error } = await this.supabase.auth.getUser(accessToken);
            if (error)
                throw new Error(error.message);
            if (!data.user)
                throw new Error('User not found');
            const { data: employee } = await this.supabaseAdmin
                .from('employees')
                .select('id, full_name, role, status')
                .eq('user_id', data.user.id)
                .single();
            if (!employee)
                throw new Error('Employee record not found');
            return {
                id: data.user.id,
                email: data.user.email,
                fullName: employee.full_name,
                role: employee.role,
                emailVerified: !!data.user.email_confirmed_at,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at),
            };
        }
        catch (error) {
            logger_1.default.error('Get current user failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— SIGN OUT ————————————————————
    async signOut(accessToken) {
        try {
            const { error } = await this.supabase.auth.signOut({ scope: 'local' });
            if (error)
                throw new Error(error.message);
        }
        catch (error) {
            logger_1.default.error('Signout failed', { error: error.message });
            throw error;
        }
    }
    // ———————————————————— PASSWORD RESET ————————————————————
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'http://localhost:3000/auth/reset-password',
            });
            if (error)
                throw new Error(error.message);
        }
        catch (error) {
            logger_1.default.error('Password reset failed', { error: error.message });
            throw error;
        }
    }
    async updatePassword(accessToken, newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({ password: newPassword });
            if (error)
                throw new Error(error.message);
        }
        catch (error) {
            logger_1.default.error('Password update failed', { error: error.message });
            throw error;
        }
    }
}
exports.SupabaseAuthRepository = SupabaseAuthRepository;
//# sourceMappingURL=SupabaseAuthRepository.js.map