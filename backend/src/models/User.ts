import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'employee';
  emailVerified: boolean;
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

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    refreshTokens: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

UserSchema.methods.isValidPasswordResetToken = function (token: string): boolean {
  return this.passwordResetToken === token && this.passwordResetExpires! > new Date();
};

UserSchema.methods.isValidEmailVerificationToken = function (token: string): boolean {
  return this.emailVerificationToken === token && this.emailVerificationExpires! > new Date();
};

UserSchema.methods.addRefreshToken = function (token: string): void {
  if (!this.refreshTokens) {
    this.refreshTokens = [];
  }
  this.refreshTokens.push(token);
};

UserSchema.methods.removeRefreshToken = function (token: string): void {
  if (this.refreshTokens) {
    this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
  }
};

export const User = mongoose.model<IUser>('User', UserSchema);

// Request/Response interfaces (unchanged)
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
