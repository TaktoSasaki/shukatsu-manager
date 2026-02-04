import uuid from 'react-native-uuid';
import { getDatabase } from './schema';
import { Company, CompanyInput, CompanyUpdate } from '../types/company';
import { getCurrentISOString } from '../utils/date';
import { DEFAULT_STATUS_LIST, FREE_PLAN_COMPANY_LIMIT } from '../constants/status';
import { scheduleInterviewNotification, cancelNotificationForCompany } from '../utils/notifications';

// ソートタイプ
export type SortType = 'manual' | 'status-asc' | 'status-desc' | 'interview';

// 全企業を取得（手動ソート順）
export async function getAllCompanies(sortType: SortType = 'manual'): Promise<Company[]> {
    const db = await getDatabase();

    let orderClause = '';
    switch (sortType) {
        case 'manual':
            orderClause = 'sortOrder ASC, updatedAt DESC';
            break;
        case 'interview':
            orderClause = `CASE WHEN nextInterviewDate IS NULL THEN 1 ELSE 0 END, nextInterviewDate ASC, updatedAt DESC`;
            break;
        case 'status-asc':
        case 'status-desc':
            // ステータス順はアプリ側でソート
            orderClause = 'sortOrder ASC';
            break;
    }

    const result = await db.getAllAsync<Company>(
        `SELECT * FROM companies ORDER BY ${orderClause}`
    );

    // ステータス順の場合はアプリ側でソート
    if (sortType === 'status-asc' || sortType === 'status-desc') {
        const statusOrder = [...DEFAULT_STATUS_LIST];
        result.sort((a, b) => {
            const aIndex = statusOrder.indexOf(a.status as any) ?? statusOrder.length;
            const bIndex = statusOrder.indexOf(b.status as any) ?? statusOrder.length;
            return sortType === 'status-asc' ? aIndex - bIndex : bIndex - aIndex;
        });
    }

    return result;
}

// IDで企業を取得
export async function getCompanyById(id: string): Promise<Company | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Company>(
        'SELECT * FROM companies WHERE id = ?',
        [id]
    );
    return result || null;
}

// 企業を作成
export async function createCompany(input: CompanyInput): Promise<Company> {
    const db = await getDatabase();

    // 登録上限チェック
    const countResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM companies'
    );
    if (countResult && countResult.count >= FREE_PLAN_COMPANY_LIMIT) {
        throw new Error(`企業の登録上限（${FREE_PLAN_COMPANY_LIMIT}社）に達しました`);
    }

    const now = getCurrentISOString();
    const id = uuid.v4() as string;

    // 最大sortOrderを取得
    const maxOrder = await db.getFirstAsync<{ maxOrder: number | null }>(
        'SELECT MAX(sortOrder) as maxOrder FROM companies'
    );
    const newSortOrder = (maxOrder?.maxOrder ?? -1) + 1;

    await db.runAsync(
        `INSERT INTO companies (
      id, companyName, loginId, myPageUrl, entryDate, nextInterviewDate,
      position, esContent, motivation, notes, status, sortOrder, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.companyName,
            input.loginId,
            input.myPageUrl,
            input.entryDate,
            input.nextInterviewDate,
            input.position,
            input.esContent,
            input.motivation,
            input.notes,
            input.status,
            newSortOrder,
            now,
            now,
        ]
    );

    // 面接日が設定されている場合、通知をスケジュール
    if (input.nextInterviewDate) {
        await scheduleInterviewNotification(id, input.companyName, input.nextInterviewDate);
    }

    return {
        ...input,
        id,
        sortOrder: newSortOrder,
        createdAt: now,
        updatedAt: now,
    };
}

// 企業を更新
export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company | null> {
    const db = await getDatabase();
    const existing = await getCompanyById(id);
    if (!existing) return null;

    const now = getCurrentISOString();
    const updated: Company = {
        ...existing,
        ...updates,
        updatedAt: now,
    };

    await db.runAsync(
        `UPDATE companies SET
      companyName = ?,
      loginId = ?,
      myPageUrl = ?,
      entryDate = ?,
      nextInterviewDate = ?,
      position = ?,
      esContent = ?,
      motivation = ?,
      notes = ?,
      status = ?,
      updatedAt = ?
    WHERE id = ?`,
        [
            updated.companyName,
            updated.loginId,
            updated.myPageUrl,
            updated.entryDate,
            updated.nextInterviewDate,
            updated.position,
            updated.esContent,
            updated.motivation,
            updated.notes,
            updated.status,
            now,
            id,
        ]
    );

    // 面接日の通知を更新
    if (updated.nextInterviewDate) {
        await scheduleInterviewNotification(id, updated.companyName, updated.nextInterviewDate);
    } else {
        await cancelNotificationForCompany(id);
    }

    return updated;
}

// 企業を削除
export async function deleteCompany(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM companies WHERE id = ?', [id]);
    return result.changes > 0;
}

// 企業の並び順を更新
export async function reorderCompanies(orderedIds: string[]): Promise<void> {
    const db = await getDatabase();

    for (let i = 0; i < orderedIds.length; i++) {
        await db.runAsync(
            'UPDATE companies SET sortOrder = ? WHERE id = ?',
            [i, orderedIds[i]]
        );
    }
}

// ステータスで絞り込み
export async function getCompaniesByStatus(status: string): Promise<Company[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Company>(
        `SELECT * FROM companies WHERE status = ? ORDER BY updatedAt DESC`,
        [status]
    );
    return result;
}

// カスタムステータス関連

export interface CustomStatus {
    id: number;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: string;
}

// 全カスタムステータスを取得
export async function getAllCustomStatuses(): Promise<CustomStatus[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<CustomStatus>(
        'SELECT * FROM custom_statuses ORDER BY sortOrder ASC'
    );
    return result;
}

// カスタムステータスを追加
export async function addCustomStatus(name: string, color: string): Promise<CustomStatus> {
    const db = await getDatabase();
    const now = getCurrentISOString();

    // 最大sortOrderを取得
    const maxOrder = await db.getFirstAsync<{ maxOrder: number | null }>(
        'SELECT MAX(sortOrder) as maxOrder FROM custom_statuses'
    );
    const newOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const result = await db.runAsync(
        'INSERT INTO custom_statuses (name, color, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
        [name, color, newOrder, now]
    );

    return {
        id: result.lastInsertRowId,
        name,
        color,
        sortOrder: newOrder,
        createdAt: now,
    };
}

// カスタムステータスを削除
export async function deleteCustomStatus(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM custom_statuses WHERE id = ?', [id]);
    return result.changes > 0;
}

// ===============================
// 選考イベント関連
// ===============================

import { SelectionEvent, SelectionEventInput, SelectionEventUpdate } from '../types/company';
import { getNextStatusAfterEvent } from '../constants/status';

// 企業の選考イベントを全て取得（日付順）
export async function getSelectionEventsByCompany(companyId: string): Promise<SelectionEvent[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<SelectionEvent>(
        `SELECT * FROM selection_events WHERE companyId = ? ORDER BY eventDate DESC, createdAt DESC`,
        [companyId]
    );
    return result;
}

// 選考イベントを作成
export async function createSelectionEvent(input: SelectionEventInput): Promise<SelectionEvent> {
    const db = await getDatabase();
    const now = getCurrentISOString();
    const id = uuid.v4() as string;

    await db.runAsync(
        `INSERT INTO selection_events (id, companyId, eventType, eventDate, result, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.companyId, input.eventType, input.eventDate, input.result, input.notes, now]
    );

    // 結果が「通過」の場合、企業のステータスを自動更新
    if (input.result === '通過') {
        const nextStatus = getNextStatusAfterEvent(input.eventType, input.result);
        if (nextStatus) {
            await updateCompany(input.companyId, { status: nextStatus });
        }
    } else if (input.result === '不通過') {
        await updateCompany(input.companyId, { status: '不採用' });
    }

    return {
        id,
        ...input,
        createdAt: now,
    };
}

// 選考イベントを更新
export async function updateSelectionEvent(id: string, updates: SelectionEventUpdate): Promise<SelectionEvent | null> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<SelectionEvent>(
        'SELECT * FROM selection_events WHERE id = ?',
        [id]
    );
    if (!existing) return null;

    const updated: SelectionEvent = {
        ...existing,
        ...updates,
    };

    await db.runAsync(
        `UPDATE selection_events SET eventType = ?, eventDate = ?, result = ?, notes = ? WHERE id = ?`,
        [updated.eventType, updated.eventDate, updated.result, updated.notes, id]
    );

    // 結果が変わった場合、企業のステータスを更新
    if (updates.result && updates.result !== existing.result) {
        if (updates.result === '通過') {
            const nextStatus = getNextStatusAfterEvent(updated.eventType, updates.result);
            if (nextStatus) {
                await updateCompany(updated.companyId, { status: nextStatus });
            }
        } else if (updates.result === '不通過') {
            await updateCompany(updated.companyId, { status: '不採用' });
        }
    }

    return updated;
}

// 選考イベントを削除
export async function deleteSelectionEvent(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM selection_events WHERE id = ?', [id]);
    return result.changes > 0;
}

