import {
    createDownloadResumable,
    deleteAsync,
    documentDirectory,
    getInfoAsync,
    makeDirectoryAsync,
} from 'expo-file-system/legacy';
// @ts-ignore
import { initWhisper as initWhisperRN, WhisperContext } from 'whisper.rn';

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';
const MODEL_FILE_NAME = 'ggml-small.bin';
const MODEL_MIN_SIZE = 60_000_000;

let whisperContext: WhisperContext | null = null;
let initializingPromise: Promise<void> | null = null;
let pendingProgressCallbacks: Array<(progress: number) => void> = [];

export async function downloadModel(onProgress?: (progress: number) => void): Promise<string> {
    if (!documentDirectory) {
        throw new Error('documentDirectory is not available');
    }

    const modelDir = `${documentDirectory}models/`;
    const modelPath = `${modelDir}${MODEL_FILE_NAME}`;

    const directoryInfo = await getInfoAsync(modelDir);
    if (!directoryInfo.exists) {
        await makeDirectoryAsync(modelDir, { intermediates: true });
    }

    const modelInfo = await getInfoAsync(modelPath);
    if (modelInfo.exists && (modelInfo.size ?? 0) >= MODEL_MIN_SIZE) {
        onProgress?.(1);
        return modelPath;
    }

    if (modelInfo.exists) {
        await deleteAsync(modelPath, { idempotent: true });
    }

    const downloadResumable = createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (downloadProgress) => {
            const total = downloadProgress.totalBytesExpectedToWrite;
            if (!total) return;
            onProgress?.(downloadProgress.totalBytesWritten / total);
        }
    );

    try {
        const result = await downloadResumable.downloadAsync();
        if (!result) {
            throw new Error('Download failed');
        }

        const downloadedInfo = await getInfoAsync(result.uri);
        if (!downloadedInfo.exists || (downloadedInfo.size ?? 0) < MODEL_MIN_SIZE) {
            await deleteAsync(modelPath, { idempotent: true });
            throw new Error('ダウンロードしたモデルファイルが不完全です');
        }

        return result.uri;
    } catch (error) {
        await deleteAsync(modelPath, { idempotent: true });
        throw error;
    }
}

export async function initWhisper(onProgress?: (progress: number) => void): Promise<void> {
    if (whisperContext) {
        return;
    }

    if (onProgress) {
        pendingProgressCallbacks.push(onProgress);
    }

    if (initializingPromise) {
        return initializingPromise;
    }

    const notifyProgress = (progress: number) => {
        pendingProgressCallbacks.forEach((callback) => callback(progress));
    };

    initializingPromise = (async () => {
        try {
            const modelPath = await downloadModel(notifyProgress);
            const normalizedModelPath = modelPath.startsWith('file://') ? modelPath.slice(7) : modelPath;

            whisperContext = await initWhisperRN({
                filePath: normalizedModelPath,
            });
        } finally {
            initializingPromise = null;
            pendingProgressCallbacks = [];
        }
    })();

    return initializingPromise;
}

export async function transcribeLocalAudio(audioUri: string): Promise<string> {
    if (!whisperContext) {
        await initWhisper();
    }

    if (!whisperContext) {
        throw new Error('Whisper context could not be initialized.');
    }

    const normalizedAudioUri = audioUri.startsWith('file://') ? audioUri.slice(7) : audioUri;

    const { promise } = whisperContext.transcribe(normalizedAudioUri, {
        language: 'ja',
        maxLen: 0,
        translate: false,
        beamSize: 5,
        bestOf: 5,
        temperature: 0.0,
        prompt: 'これは就職活動の面接メモです。自然な日本語として文字起こししてください。',
    });

    const result = await promise;
    if (!result?.result) {
        throw new Error('Transcription failed or returned empty.');
    }

    return result.result.trim();
}

export async function releaseWhisper(): Promise<void> {
    if (!whisperContext) return;
    await whisperContext.release();
    whisperContext = null;
}
