"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveFrames = getActiveFrames;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const logger_1 = require("./logger");
async function getActiveFrames(eventId) {
    const framesDir = config_1.config.eventFrames(eventId);
    try {
        const frameDirs = await promises_1.default.readdir(framesDir);
        const activeFrames = [];
        for (const frameId of frameDirs) {
            const configPath = path_1.default.join(framesDir, frameId, 'config.json');
            const imagePath = path_1.default.join(framesDir, frameId, 'frame.png');
            try {
                const configData = await promises_1.default.readFile(configPath, 'utf8');
                const frameConfig = JSON.parse(configData);
                if (!frameConfig.disabled) {
                    activeFrames.push({ id: frameId, config: frameConfig, imagePath });
                }
            }
            catch (err) {
                logger_1.logger.warn(`Could not load frame config for ${frameId}: ${err.message}`);
            }
        }
        return activeFrames;
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return []; // No frames dir for this event
        }
        throw err;
    }
}
