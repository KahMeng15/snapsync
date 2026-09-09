export declare function generateSignedUrl(shareToken: string, id: string, expiresInSeconds?: number, baseUrl?: string): string;
export declare function verifySignedUrl(shareToken: string, id: string, exp: string, sig: string): boolean;
