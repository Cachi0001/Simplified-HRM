import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signUp(req: Request, res: Response): Promise<void>;
    signIn(req: Request, res: Response): Promise<void>;
    signInWithGoogle(req: Request, res: Response): Promise<void>;
    getCurrentUser(req: Request, res: Response): Promise<void>;
    updatePassword(req: Request, res: Response): Promise<void>;
    signOut(req: Request, res: Response): Promise<void>;
    refreshToken(req: Request, res: Response): Promise<void>;
    resetPassword(req: Request, res: Response): Promise<void>;
    resendConfirmationEmail(req: Request, res: Response): Promise<void>;
    notifyAdmin(req: Request, res: Response): Promise<void>;
    confirmEmail(req: Request, res: Response): Promise<void>;
    resetPasswordWithToken(req: Request, res: Response): Promise<void>;
    confirmEmailByToken(req: Request, res: Response): Promise<void>;
    private generateAccessToken;
    private generateRefreshToken;
}
//# sourceMappingURL=AuthController.d.ts.map