"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("./config");
const logDir = config_1.config.storage.logs;
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
}));
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), logFormat),
    }),
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        format: logFormat,
        symlinkName: 'latest.log',
        createSymlink: true
    }),
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'error-%DATE%.log'),
        level: 'error',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        format: logFormat,
        symlinkName: 'latest-error.log',
        createSymlink: true
    })
];
exports.logger = winston_1.default.createLogger({
    level: config_1.config.isProduction ? 'info' : 'debug',
    transports,
});
