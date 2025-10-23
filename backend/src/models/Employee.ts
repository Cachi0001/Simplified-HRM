import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';

  // Optional fields - can be set later in profile settings
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;

  status: 'active' | 'rejected' | 'pending';
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      required: true,
    },
    // Optional fields
    department: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    hireDate: {
      type: Date,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'rejected', 'pending'],
      default: 'pending',
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
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
EmployeeSchema.index({ userId: 1 });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);

// Request/Response interfaces (unchanged)
export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role: 'admin' | 'employee';

  // Optional fields for initial creation
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;
  status?: 'active' | 'rejected' | 'pending';
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: 'active' | 'rejected' | 'pending';
  role?: 'admin' | 'employee';
}
