import { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable, deleteAsync } from 'expo-file-system/legacy';
// @ts-ignore
import { initWhisper as initWhisperRN, WhisperContext } from 'whisper.rn';
import { Platform } from 'react-native';

// モデルのダウンロードURL（テスト用に軽量なggml-tiny.binを使用）
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
const MODEL_FILE_NAME = 'ggml-tiny.bin';

let whisperContext: WhisperContext | null = null;

/**
 * モデルがローカルにあるか確認し、無ければダウンロードする
 * ダウンロード進捗をコールバックで返す
 */
export async function downloadModel(
    onProgress?: (progress: number) => void
): Promise<string> {
    if (!documentDirectory) {
        throw new Error('documentDirectory is not available');
    }
    const modelDir = documentDirectory + 'models/';
    const modelPath = modelDir + MODEL_FILE_NAME;

    // ディレクトリ作成
    const dirInfo = await getInfoAsync(modelDir);
    if (!dirInfo.exists) {
        await makeDirectoryAsync(modelDir, { intermediates: true });
    }

    const modelInfo = await getInfoAsync(modelPath);
    if (modelInfo.exists && modelInfo.size && modelInfo.size > 0) {
        // 既に存在する場合は再利用
        if (onProgress) onProgress(1); // 100%
        return modelPath;
    }

    // FileSystem.createDownloadResumable を使ってダウンロード
    const downloadResumable = createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            if (onProgress) onProgress(progress);
        }
    );

    try {
        const result = await downloadResumable.downloadAsync();
        if (!result) throw new Error('Download failed');
        return result.uri;
    } catch (e) {
        // 失敗した場合は削除しておく
        await deleteAsync(modelPath, { idempotent: true });
        throw e;
    }
}

/**
 * Whisperコンテキストの初期化
 */
export async function initWhisper(onProgress?: (progress: number) => void): Promise<void> {
    if (whisperContext) {
        return; // 既に初期化済み
    }

    // 1. モデルの準備
    const modelPath = await downloadModel(onProgress);

    // 2. Whisperコンテキスト作成
    whisperContext = await initWhisperRN({
        filePath: modelPath,
    });
}

/**
 * 録音したWAVファイルを文字起こしする
 */
export async function transcribeLocalAudio(audioUri: string): Promise<string> {
    if (!whisperContext) {
        // コンテキストがなければ初期化（プログレスなし）
        await initWhisper();
    }

    if (!whisperContext) {
        throw new Error('Whisper context could not be initialized.');
    }

    // パスの正規化（iOSの場合 'file://' プレフィックスを外すことが多い）
    let cleanUri = audioUri;
    if (Platform.OS === 'ios' && cleanUri.startsWith('file://')) {
        cleanUri = cleanUri.replace('file://', '');
    }

    // 文字起こし実行（日本語指定）
    const { promise } = whisperContext.transcribe(cleanUri, {
        language: 'ja',
    });

    const result = await promise;

    if (!result || !result.result) {
        throw new Error('Transcription failed or returned empty.');
    }

    return result.result.trim();
}

/**
 * メモリ解放
 */
export async function releaseWhisper(): Promise<void> {
    if (whisperContext) {
        await whisperContext.release();
        whisperContext = null;
    }
}
