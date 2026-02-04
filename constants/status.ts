// 企業登録の上限（無料プラン）
export const FREE_PLAN_COMPANY_LIMIT = 5;

// 選考イベントの種類
export const EVENT_TYPES = [
    'ES提出',
    '書類選考',
    '適性検査',
    'GD',
    '一次面接',
    '二次面接',
    '三次面接',
    '最終面接',
    'リクルーター面談',
    'カジュアル面談',
    'その他',
] as const;

// 選考結果
export const EVENT_RESULTS = [
    '結果待ち',
    '通過',
    '不通過',
] as const;

// 結果の色設定
export const RESULT_COLORS: Record<string, string> = {
    '結果待ち': '#F59E0B', // amber
    '通過': '#10B981', // green
    '不通過': '#EF4444', // red
};

// デフォルトの選考状況リスト（前/後で細分化）
export const DEFAULT_STATUS_LIST = [
    '未エントリー',
    'ES提出前',
    'ES提出後',
    'ES通過',
    '一次面接前',
    '一次面接後',
    '一次通過',
    '二次面接前',
    '二次面接後',
    '二次通過',
    '三次面接前',
    '三次面接後',
    '三次通過',
    '最終面接前',
    '最終面接後',
    '内定',
    '不採用',
    '辞退',
] as const;

// ステータスの色設定
export const STATUS_COLORS: Record<string, string> = {
    '未エントリー': '#9CA3AF',
    'ES提出前': '#CBD5E1',
    'ES提出後': '#3B82F6',
    'ES通過': '#2563EB',
    '一次面接前': '#FBBF24',
    '一次面接後': '#F59E0B',
    '一次通過': '#D97706',
    '二次面接前': '#FB923C',
    '二次面接後': '#F97316',
    '二次通過': '#EA580C',
    '三次面接前': '#F87171',
    '三次面接後': '#EF4444',
    '三次通過': '#DC2626',
    '最終面接前': '#F472B6',
    '最終面接後': '#EC4899',
    '内定': '#10B981',
    '不採用': '#6B7280',
    '辞退': '#6B7280',
};

// カスタムステータスのデフォルト色
export const DEFAULT_CUSTOM_STATUS_COLOR = '#6366F1';

// イベント種類に応じた次のステータスを取得
export function getNextStatusAfterEvent(eventType: string, result: string): string | null {
    if (result !== '通過') return null;

    const statusMap: Record<string, string> = {
        'ES提出': 'ES通過',
        '書類選考': 'ES通過',
        '一次面接': '一次通過',
        '二次面接': '二次通過',
        '三次面接': '三次通過',
        '最終面接': '内定',
    };

    return statusMap[eventType] || null;
}
