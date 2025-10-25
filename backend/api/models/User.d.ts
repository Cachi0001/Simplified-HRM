import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    fullName: string;
    role: 'admin' | 'employee';
    emailVerified: boolean;
    passwordHash: string;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    refreshTokens?: string[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
    isValidPasswordResetToken(token: string): boolean;
    isValidEmailVerificationToken(token: string): boolean;
    addRefreshToken(token: string): void;
    removeRefreshToken(token: string): void;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface CreateUserRequest {
    email: string;
    password: string;
    fullName: string;
    role?: 'admin' | 'employee';
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: IUser;
    accessToken: string;
    refreshToken?: string;
    requiresEmailVerification?: boolean;
    requiresConfirmation?: boolean;
    message?: string;
}
//# sourceMappingURL=User.d.ts.map