export interface FrameConfig {
    name: string;
    canvasWidth: number;
    canvasHeight: number;
    layout: '1x3' | '1x4' | '2x2' | 'single';
    photoBoxes: {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation?: number;
    }[];
    disabled?: boolean;
}
export declare function getActiveFrames(eventId: string): Promise<{
    id: string;
    config: FrameConfig;
    imagePath: string;
}[]>;
