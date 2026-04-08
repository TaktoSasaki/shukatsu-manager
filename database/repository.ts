import uuid from 'react-native-uuid';
import {
    DEFAULT_STATUS,
    DEFAULT_STATUS_LIST,
    FREE_PLAN_COMPANY_LIMIT,
    REJECTED_STATUS,
    getNextStatusAfterEvent,
    isSystemStatus,
} from '../constants/status';
import type { Company, CompanyInput, CompanyUpdate, SelectionEvent, SelectionEventInput, SelectionEventUpdate } from '../types/company';
import { compareDateOnly, getCurrentISOString } from '../utils/date';
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '../utils/calendar';
import { cancelNotificationForCompany, scheduleInterviewNotification } from '../utils/notifications';
import { getDatabase } from './schema';

export type SortType = 'manual' | 'status-asc' | 'status-desc' | 'interview';

function getStatusOrderIndex(status: string): number {
    const index = DEFAULT_STATUS_LIST.indexOf(status as typeof DEFAULT_STATUS_LIST[number]);
    return index === -1 ? DEFAULT_STATUS_LIST.length : index;
}

function sortEventsForStatus(events: SelectionEvent[]): SelectionEvent[] {
    return [...events].sort((left, right) => {
        const dateOrder = compareDateOnly(left.eventDate, right.eventDate);
        if (dateOrder !== 0) return dateOrder;
        return left.createdAt.localeCompare(right.createdAt);
    });
}

function deriveStatusFromEvents(events: SelectionEvent[]): string | null {
    let derivedStatus: string | null = null;

    for (const event of sortEventsForStatus(events)) {
        if (event.result === '通過') {
            derivedStatus = getNextStatusAfterEvent(event.eventType, event.result) ?? derivedStatus;
            continue;
        }

        if (event.result === '不通過') {
            derivedStatus = REJECTED_STATUS;
        }
    }

    return derivedStatus;
}

async function syncInterviewArtifacts(
    companyId: string,
    companyName: string,
    nextInterviewDate: string | null,
    previousCalendarEventId: string | null
): Promise<string | null> {
    if (!nextInterviewDate) {
        await cancelNotificationForCompany(companyId);
        if (previousCalendarEventId) {
            await deleteCalendarEvent(previousCalendarEventId);
        }
        return null;
    }

    await scheduleInterviewNotification(companyId, companyName, nextInterviewDate);
    return updateCalendarEvent(previousCalendarEventId, companyName, nextInterviewDate);
}

async function refreshCompanyStatusFromEvents(companyId: string): Promise<string | null> {
    const db = await getDatabase();
    const company = await db.getFirstAsync<Company>('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return null;

    if (!isSystemStatus(company.status)) {
        return company.status;
    }

    const events = await db.getAllAsync<SelectionEvent>(
        'SELECT * FROM selection_events WHERE companyId = ?',
        [companyId]
    );
    const nextStatus = deriveStatusFromEvents(events) ?? DEFAULT_STATUS;

    if (nextStatus !== company.status) {
        await db.runAsync(
            'UPDATE companies SET status = ?, updatedAt = ? WHERE id = ?',
            [nextStatus, getCurrentISOString(), companyId]
        );
    }

    return nextStatus;
}

export async function getAllCompanies(sortType: SortType = 'manual'): Promise<Company[]> {
    const db = await getDatabase();

    let orderClause = 'sortOrder ASC, updatedAt DESC';
    switch (sortType) {
        case 'interview':
            orderClause = 'CASE WHEN nextInterviewDate IS NULL THEN 1 ELSE 0 END, nextInterviewDate ASC, updatedAt DESC';
            break;
        case 'status-asc':
        case 'status-desc':
            orderClause = 'sortOrder ASC';
            break;
    }

    const companies = await db.getAllAsync<Company>(`SELECT * FROM companies ORDER BY ${orderClause}`);

    if (sortType === 'status-asc' || sortType === 'status-desc') {
        companies.sort((left, right) => {
            const diff = getStatusOrderIndex(left.status) - getStatusOrderIndex(right.status);
            return sortType === 'status-asc' ? diff : -diff;
        });
    }

    return companies;
}

export async function getCompanyById(id: string): Promise<Company | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync<Company>('SELECT * FROM companies WHERE id = ?', [id])) ?? null;
}

export async function createCompany(input: CompanyInput): Promise<Company> {
    const db = await getDatabase();
    const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM companies');
    if (countResult && countResult.count >= FREE_PLAN_COMPANY_LIMIT) {
        throw new Error(`企業の登録上限（${FREE_PLAN_COMPANY_LIMIT}社）に達しました`);
    }

    const now = getCurrentISOString();
    const id = uuid.v4() as string;
    const maxOrder = await db.getFirstAsync<{ maxOrder: number | null }>('SELECT MAX(sortOrder) as maxOrder FROM companies');
    const newSortOrder = (maxOrder?.maxOrder ?? -1) + 1;

    await db.runAsync(
        `INSERT INTO companies (
            id, companyName, loginId, myPageUrl, entryDate, nextInterviewDate,
            position, esContent, motivation, notes, transcription, status, sortOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            input.transcription ?? null,
            input.status,
            newSortOrder,
            now,
            now,
        ]
    );

    const calendarEventId = await syncInterviewArtifacts(id, input.companyName, input.nextInterviewDate, null);
    if (calendarEventId) {
        await db.runAsync('UPDATE companies SET calendarEventId = ? WHERE id = ?', [calendarEventId, id]);
    }

    return {
        ...input,
        id,
        sortOrder: newSortOrder,
        calendarEventId,
        createdAt: now,
        updatedAt: now,
    };
}

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
            transcription = ?,
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
            updated.transcription,
            updated.status,
            now,
            id,
        ]
    );

    const calendarEventId = await syncInterviewArtifacts(
        id,
        updated.companyName,
        updated.nextInterviewDate,
        existing.calendarEventId
    );

    if (calendarEventId !== existing.calendarEventId) {
        updated.calendarEventId = calendarEventId;
        await db.runAsync('UPDATE companies SET calendarEventId = ? WHERE id = ?', [calendarEventId, id]);
    }

    return updated;
}

export async function deleteCompany(id: string): Promise<boolean> {
    const db = await getDatabase();
    await cancelNotificationForCompany(id);

    const existing = await getCompanyById(id);
    if (existing?.calendarEventId) {
        await deleteCalendarEvent(existing.calendarEventId);
    }

    const result = await db.runAsync('DELETE FROM companies WHERE id = ?', [id]);
    return result.changes > 0;
}

export async function reorderCompanies(orderedIds: string[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
        for (const [index, companyId] of orderedIds.entries()) {
            await db.runAsync('UPDATE companies SET sortOrder = ? WHERE id = ?', [index, companyId]);
        }
    });
}

export async function getCompaniesByStatus(status: string): Promise<Company[]> {
    const db = await getDatabase();
    return db.getAllAsync<Company>(
        'SELECT * FROM companies WHERE status = ? ORDER BY updatedAt DESC',
        [status]
    );
}

export interface CustomStatus {
    id: number;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: string;
}

export async function getAllCustomStatuses(): Promise<CustomStatus[]> {
    const db = await getDatabase();
    return db.getAllAsync<CustomStatus>('SELECT * FROM custom_statuses ORDER BY sortOrder ASC');
}

export async function addCustomStatus(name: string, color: string): Promise<CustomStatus> {
    const db = await getDatabase();
    const now = getCurrentISOString();
    const maxOrder = await db.getFirstAsync<{ maxOrder: number | null }>(
        'SELECT MAX(sortOrder) as maxOrder FROM custom_statuses'
    );
    const sortOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const result = await db.runAsync(
        'INSERT INTO custom_statuses (name, color, sortOrder, createdAt) VALUES (?, ?, ?, ?)',
        [name, color, sortOrder, now]
    );

    return {
        id: result.lastInsertRowId,
        name,
        color,
        sortOrder,
        createdAt: now,
    };
}

export async function deleteCustomStatus(id: number): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<CustomStatus>('SELECT * FROM custom_statuses WHERE id = ?', [id]);
    if (!existing) return false;

    const usage = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM companies WHERE status = ?',
        [existing.name]
    );
    if ((usage?.count ?? 0) > 0) {
        throw new Error('利用中のカスタムステータスは削除できません');
    }

    const result = await db.runAsync('DELETE FROM custom_statuses WHERE id = ?', [id]);
    return result.changes > 0;
}

export async function getSelectionEventsByCompany(companyId: string): Promise<SelectionEvent[]> {
    const db = await getDatabase();
    return db.getAllAsync<SelectionEvent>(
        'SELECT * FROM selection_events WHERE companyId = ? ORDER BY eventDate DESC, createdAt DESC',
        [companyId]
    );
}

export async function createSelectionEvent(input: SelectionEventInput): Promise<SelectionEvent> {
    const db = await getDatabase();
    const now = getCurrentISOString();
    const id = uuid.v4() as string;

    await db.runAsync(
        `INSERT INTO selection_events (id, companyId, eventType, eventDate, result, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.companyId, input.eventType, input.eventDate, input.result, input.notes, now]
    );

    await refreshCompanyStatusFromEvents(input.companyId);

    return {
        id,
        ...input,
        createdAt: now,
    };
}

export async function updateSelectionEvent(id: string, updates: SelectionEventUpdate): Promise<SelectionEvent | null> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<SelectionEvent>('SELECT * FROM selection_events WHERE id = ?', [id]);
    if (!existing) return null;

    const updated: SelectionEvent = {
        ...existing,
        ...updates,
    };

    await db.runAsync(
        'UPDATE selection_events SET eventType = ?, eventDate = ?, result = ?, notes = ? WHERE id = ?',
        [updated.eventType, updated.eventDate, updated.result, updated.notes, id]
    );

    await refreshCompanyStatusFromEvents(updated.companyId);
    return updated;
}

export async function deleteSelectionEvent(id: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<SelectionEvent>('SELECT * FROM selection_events WHERE id = ?', [id]);
    if (!existing) return false;

    const result = await db.runAsync('DELETE FROM selection_events WHERE id = ?', [id]);
    if (result.changes > 0) {
        await refreshCompanyStatusFromEvents(existing.companyId);
        return true;
    }

    return false;
}
