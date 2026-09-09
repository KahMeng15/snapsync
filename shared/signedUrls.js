"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedUrl = generateSignedUrl;
exports.verifySignedUrl = verifySignedUrl;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
function generateSignedUrl(shareToken, id, expiresInSeconds = 3600, baseUrl = '/api/share') {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${shareToken}:${id}:${exp}`;
    const sig = crypto_1.default.createHmac('sha256', config_1.config.security.signedUrlSecret).update(payload).digest('hex');
    return `${baseUrl.replace(/\/$/, '')}/${shareToken}/photo/${encodeURIComponent(id)}?exp=${exp}&sig=${sig}`;
}
function verifySignedUrl(shareToken, id, exp, sig) {
    if (!shareToken || !id || !exp || !sig)
        return false;
    const expires = parseInt(exp, 10);
    if (isNaN(expires) || expires < Math.floor(Date.now() / 1000)) {
        return false;
    }
    const payload = `${shareToken}:${id}:${exp}`;
    const expectedSig = crypto_1.default
        .createHmac('sha256', config_1.config.security.signedUrlSecret)
        .update(payload)
        .digest('hex');
    if (sig.length !== 64)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
}
