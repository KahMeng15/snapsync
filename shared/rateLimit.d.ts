import type { Request, Response, NextFunction, RequestHandler } from 'express';
export declare function checkBandwidthLimits(req: Request, res: Response, next: NextFunction, scope: 'admin' | 'share'): Response<any, Record<string, any>> | undefined;
export declare const adminRateLimiter: RequestHandler;
export declare const shareRateLimiter: RequestHandler;
