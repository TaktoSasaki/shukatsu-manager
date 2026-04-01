import { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable, deleteAsync } from 'expo-file-system/legacy';
// @ts-ignore
import { initWhisper as initWhisperRN, WhisperContext } from 'whisper.rn';
import { Platform } from 'react-native';

// モデルのダウンロードURL（ggml-small.bin を使用）
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';
const MODEL_FILE_NAME = 'ggml-small.bin';
// ggml-small.bin の期待される最小サイズ（約466MB）。破損ファイル検出に利用
const MODEL_MIN_SIZE = 450_000_000;

let whisperContext: WhisperContext | null = null;
let initializingPromise: Promise<void> | null = null;

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
    if (modelInfo.exists && modelInfo.size && modelInfo.size > MODEL_MIN_SIZE) {
        // 既に存在し、サイズも十分な場合は再利用
        if (onProgress) onProgress(1); // 100%
        return modelPath;
    }

    // 破損ファイルが残っている場合は削除
    if (modelInfo.exists) {
        await deleteAsync(modelPath, { idempotent: true });
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

        // ダウンロード後にサイズ検証
        const downloadedInfo = await getInfoAsync(result.uri);
        if (!downloadedInfo.exists || !downloadedInfo.size || downloadedInfo.size < MODEL_MIN_SIZE) {
            await deleteAsync(modelPath, { idempotent: true });
            throw new Error('ダウンロードされたモデルファイルが破損しています。ネットワーク接続を確認して再度お試しください。');
        }

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
    // 初期化中の場合は同じPromiseを返して競合状態を防ぐ
    if (initializingPromise) {
        return initializingPromise;
    }

    initializingPromise = (async () => {
        try {
            // 1. モデルの準備
            const modelPath = await downloadModel(onProgress);

            // 2. Whisperコンテキスト作成
            // file:// プレフィックスを除去（whisper.rn はローカルパスを期待する）
            let cleanPath = modelPath;
            if (cleanPath.startsWith('file://')) {
                cleanPath = cleanPath.slice(7);
            }

            whisperContext = await initWhisperRN({
                filePath: cleanPath,
            });
        } finally {
            initializingPromise = null;
        }
    })();

    return initializingPromise;
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

    // パスの正規化（whisper.rn は内部で file:// を除去するが念のため）
    let cleanUri = audioUri;
    if (cleanUri.startsWith('file://')) {
        cleanUri = cleanUri.slice(7);
    }

    // 文字起こし実行（日本語指定 + ハルシネーション抑制パラメータ）
    const { promise } = whisperContext.transcribe(cleanUri, {
        language: 'ja',
        maxLen: 0,         // セグメント長制限なし（途中で切れるのを防止）
        translate: false,  // 翻訳しない（日本語のまま出力）
        beamSize: 5,       // ビームサーチで精度向上
        bestOf: 5,         // 候補数を増やして精度向上
        temperature: 0.0,  // 決定論的にすることでハルシネーションを抑制
        prompt: "これは就職活動の面接の録音です。自然な日本語で文字起こししてください。", // コンテキストを与えて日本語精度を向上
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
