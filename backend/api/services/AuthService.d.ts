import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { IUser, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';
export declare class AuthService {
    private authRepository;
    constructor(authRepository: IAuthRepository);
    signUp(userData: CreateUserRequest): Promise<AuthResponse>;
    signIn(credentials: LoginRequest): Promise<AuthResponse>;
    signInWithGoogle(provider: string, idToken?: string): Promise<AuthResponse>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    updatePassword(email: string, currentPassword: string, newPassword: string): Promise<void>;
    getCurrentUser(accessToken: string): Promise<IUser>;
    signOut(accessToken: string): Promise<void>;
    resetPassword(email: string): Promise<void>;
    resendConfirmationEmail(email: string): Promise<{
        message: string;
    }>;
    confirmEmail(accessToken: string, refreshToken: string): Promise<AuthResponse>;
    getEmployeeByUserId(userId: string): Promise<any>;
    createEmployeeRecord(employeeData: any): Promise<any>;
    confirmEmailByToken(token: string): Promise<AuthResponse>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=AuthService.d.ts.map