"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attendance = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AttendanceSchema = new mongoose_1.Schema({
    employeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    locationType: {
        type: String,
        enum: ['onsite', 'remote'],
        default: 'remote',
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
}, {
    timestamps: true,
});
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
exports.Attendance = mongoose_1.default.model('Attendance', AttendanceSchema);
//# sourceMappingURL=Attendance.js.map