import mongoose, { Schema, Document } from 'mongoose';

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
  status: 'checked_in' | 'checked_out';
  date: Date;
  totalHours?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      accuracy: {
        type: Number,
      },
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalHours: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AttendanceSchema.index({ employeeId: 1 });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ status: 1 });
AttendanceSchema.index({ employeeId: 1, date: 1 });

// Calculate total hours when checkOutTime is set
AttendanceSchema.pre('save', function (next) {
  if (this.checkOutTime && this.checkInTime && !this.totalHours) {
    const diffMs = this.checkOutTime.getTime() - this.checkInTime.getTime();
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
  next();
});

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

// Request/Response interfaces (unchanged)
export interface CreateAttendanceRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
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
