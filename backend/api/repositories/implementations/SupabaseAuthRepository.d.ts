import { IAuthRepository } from '../interfaces/IAuthRepository';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';
export declare class SupabaseAuthRepository implements IAuthRepository {
    private _supabase;
    private _supabaseAdmin;
    constructor();
    private get supabase();
    private get supabaseAdmin();
    signUp(userData: CreateUserRequest): Promise<AuthResponse>;
    signIn(credentials: LoginRequest): Promise<AuthResponse>;
    signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    getCurrentUser(accessToken: string): Promise<User>;
    signOut(accessToken: string): Promise<void>;
    resetPassword(email: string): Promise<void>;
    updatePassword(accessToken: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=SupabaseAuthRepository.d.ts.map