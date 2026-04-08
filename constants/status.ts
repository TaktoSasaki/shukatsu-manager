export const FREE_PLAN_COMPANY_LIMIT = 5;

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

export const EVENT_RESULTS = [
    '結果待ち',
    '通過',
    '不通過',
] as const;

export const RESULT_COLORS: Record<string, string> = {
    結果待ち: '#F59E0B',
    通過: '#10B981',
    不通過: '#EF4444',
};

export const DEFAULT_STATUS_LIST = [
    '未エントリー',
    'ES準備',
    'ES提出済み',
    'ES通過',
    '一次面接予定',
    '一次面接済み',
    '一次通過',
    '二次面接予定',
    '二次面接済み',
    '二次通過',
    '三次面接予定',
    '三次面接済み',
    '三次通過',
    '最終面接予定',
    '最終面接済み',
    '内定',
    '応募停止',
    '終了',
] as const;

export type EventType = typeof EVENT_TYPES[number];
export type EventResult = typeof EVENT_RESULTS[number];
export type SystemStatus = typeof DEFAULT_STATUS_LIST[number];

export const STATUS_COLORS: Record<string, string> = {
    未エントリー: '#9CA3AF',
    ES準備: '#CBD5E1',
    ES提出済み: '#3B82F6',
    ES通過: '#2563EB',
    一次面接予定: '#FBBF24',
    一次面接済み: '#F59E0B',
    一次通過: '#D97706',
    二次面接予定: '#FB923C',
    二次面接済み: '#F97316',
    二次通過: '#EA580C',
    三次面接予定: '#F87171',
    三次面接済み: '#EF4444',
    三次通過: '#DC2626',
    最終面接予定: '#F472B6',
    最終面接済み: '#EC4899',
    内定: '#10B981',
    応募停止: '#6B7280',
    終了: '#6B7280',
};

export const DEFAULT_CUSTOM_STATUS_COLOR = '#6366F1';
export const REJECTED_STATUS: SystemStatus = '応募停止';
export const DEFAULT_STATUS: SystemStatus = '未エントリー';

export function isEventType(value: string): value is EventType {
    return EVENT_TYPES.includes(value as EventType);
}

export function isEventResult(value: string): value is EventResult {
    return EVENT_RESULTS.includes(value as EventResult);
}

export function isSystemStatus(value: string): value is SystemStatus {
    return DEFAULT_STATUS_LIST.includes(value as SystemStatus);
}

export function getNextStatusAfterEvent(eventType: EventType, result: EventResult): SystemStatus | null {
    if (result !== '通過') return null;

    const statusMap: Record<EventType, SystemStatus | null> = {
        ES提出: 'ES通過',
        書類選考: 'ES通過',
        適性検査: null,
        GD: null,
        一次面接: '一次通過',
        二次面接: '二次通過',
        三次面接: '三次通過',
        最終面接: '内定',
        リクルーター面談: null,
        カジュアル面談: null,
        その他: null,
    };

    return statusMap[eventType];
}
