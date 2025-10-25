import mongoose, { Document } from 'mongoose';
export interface ITask extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    assigneeId: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Task: mongoose.Model<ITask, {}, {}, {}, mongoose.Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface CreateTaskRequest {
    title: string;
    description?: string;
    assigneeId: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate: Date;
}
export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date;
}
export interface TaskQuery {
    assigneeId?: string;
    assignedBy?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    page?: number;
    limit?: number;
}
//# sourceMappingURL=Task.d.ts.map