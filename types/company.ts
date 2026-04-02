import type { EventResult, EventType } from '../constants/status';

export interface Company {
  id: string;
  companyName: string;
  loginId: string | null;
  myPageUrl: string | null;
  entryDate: string | null;
  nextInterviewDate: string | null;
  position: string | null;
  esContent: string | null;
  motivation: string | null;
  notes: string | null;
  transcription: string | null;
  status: string;
  sortOrder: number;
  calendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'calendarEventId'>;
export type CompanyUpdate = Partial<CompanyInput>;

export interface SelectionEvent {
  id: string;
  companyId: string;
  eventType: EventType;
  eventDate: string | null;
  result: EventResult;
  notes: string | null;
  createdAt: string;
}

export type SelectionEventInput = Omit<SelectionEvent, 'id' | 'createdAt'>;
export type SelectionEventUpdate = Partial<SelectionEventInput>;
