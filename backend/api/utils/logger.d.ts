declare const logger: {
    info: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
    cors: {
        request: (origin: string, allowed: boolean) => void;
        config: (config: any) => void;
    };
};
export default logger;
//# sourceMappingURL=logger.d.ts.map