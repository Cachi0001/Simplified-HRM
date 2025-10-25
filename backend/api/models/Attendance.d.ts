import mongoose, { Document } from 'mongoose';
export interface IAttendance extends Document {
    _id: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    checkInTime: Date;
    checkOutTime?: Date;
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    locationType: 'onsite' | 'remote';
    status: 'checked_in' | 'checked_out';
    date: Date;
    totalHours?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Attendance: mongoose.Model<IAttendance, {}, {}, {}, mongoose.Document<unknown, {}, IAttendance, {}, {}> & IAttendance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface CreateAttendanceRequest {
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    locationType?: 'onsite' | 'remote';
    notes?: string;
}
export interface CheckInRequest extends CreateAttendanceRequest {
    type: 'checkin';
}
export interface CheckOutRequest extends CreateAttendanceRequest {
    type: 'checkout';
}
export interface AttendanceQuery {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'checked_in' | 'checked_out';
    page?: number;
    limit?: number;
}
//# sourceMappingURL=Attendance.d.ts.map