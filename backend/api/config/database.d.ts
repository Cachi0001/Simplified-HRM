import mongoose from 'mongoose';
export declare class DatabaseConfig {
    private static instance;
    private isConnected;
    private constructor();
    static getInstance(): DatabaseConfig;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): typeof mongoose;
    isDbConnected(): boolean;
}
declare const _default: DatabaseConfig;
export default _default;
//# sourceMappingURL=database.d.ts.map