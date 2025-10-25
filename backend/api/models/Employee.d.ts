import mongoose, { Document } from 'mongoose';
export interface IEmployee extends Document {
    _id: mongoose.Types.ObjectId;
    id?: string;
    userId: mongoose.Types.ObjectId;
    email: string;
    fullName: string;
    role: 'admin' | 'employee';
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
export declare const Employee: mongoose.Model<IEmployee, {}, {}, {}, mongoose.Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface CreateEmployeeRequest {
    email: string;
    fullName: string;
    role: 'admin' | 'employee';
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
//# sourceMappingURL=Employee.d.ts.map