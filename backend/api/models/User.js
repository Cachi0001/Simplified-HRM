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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const UserSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });
// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
UserSchema.methods.generateEmailVerificationToken = function () {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
};
UserSchema.methods.generatePasswordResetToken = function () {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return token;
};
UserSchema.methods.isValidPasswordResetToken = function (token) {
    return this.passwordResetToken === token && this.passwordResetExpires > new Date();
};
UserSchema.methods.isValidEmailVerificationToken = function (token) {
    return this.emailVerificationToken === token && this.emailVerificationExpires > new Date();
};
UserSchema.methods.addRefreshToken = function (token) {
    if (!this.refreshTokens) {
        this.refreshTokens = [];
    }
    this.refreshTokens.push(token);
};
UserSchema.methods.removeRefreshToken = function (token) {
    if (this.refreshTokens) {
        this.refreshTokens = this.refreshTokens.filter((t) => t !== token);
    }
};
exports.User = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map