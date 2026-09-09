declare const projectRoot: string;
export { projectRoot };
export declare const config: {
    port: number;
    nodeEnv: string;
    isProduction: boolean;
    jwt: {
        secret: string;
        refreshSecret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
    cookie: {
        domain: string | undefined;
        path: string;
        sameSite: "lax" | "strict" | "none";
        secure: boolean;
    };
    operator: {
        email: string;
        password: string;
    };
    storage: {
        photos: string;
        frames: string;
        logs: string;
    };
    eventPhotosDir: (eventId: string) => string;
    eventFrames: (eventId: string) => string;
    eventFramedPhotos: (eventId: string) => string;
    upload: {
        maxFileSize: number;
        maxFiles: number;
    };
    allowedOrigins: string[];
    rateLimit: {
        login: {
            max: number;
            windowMs: number;
        };
        api: {
            max: number;
            windowMs: number;
        };
    };
    security: {
        signedUrlSecret: string;
    };
    imageProcessing: {
        webpQuality: number;
        framedJpegQuality: number;
        avifQuality: number;
        thumbnailQuality: number;
        stripQuality: number;
        maxConcurrent: number;
        thumbnailSize: number;
        gifFrameDelay: number;
        gifMaxSize: number;
    };
};
