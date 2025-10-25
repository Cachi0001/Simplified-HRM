import { IAuthRepository } from '../interfaces/IAuthRepository';
import { IUser, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';
export declare class MongoAuthRepository implements IAuthRepository {
    private jwtSecret;
    private jwtRefreshSecret;
    constructor();
    signUp(userData: CreateUserRequest): Promise<AuthResponse>;
    signIn(credentials: LoginRequest): Promise<AuthResponse>;
    signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    getCurrentUser(accessToken: string): Promise<IUser>;
    signOut(accessToken: string): Promise<void>;
    resetPassword(email: string): Promise<void>;
    updatePassword(accessToken: string, newPassword: string): Promise<void>;
    updatePasswordByEmail(email: string, newPassword: string): Promise<void>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<void>;
    confirmEmailByToken(token: string): Promise<AuthResponse>;
    setSession(accessToken: string, refreshToken: string): Promise<any>;
    getEmployeeByUserId(userId: string): Promise<any>;
    createEmployeeRecord(employeeData: any): Promise<any>;
    resendConfirmationEmail(email: string): Promise<{
        message: string;
    }>;
    private notifyAdminsOfNewSignup;
    private extractEmailFromToken;
    private generateRefreshToken;
    private generateAccessToken;
}
//# sourceMappingURL=MongoAuthRepository.d.ts.map