// 企業データの型定義

export interface Company {
  id: string;
  companyName: string;
  loginId: string | null; // マイページのログインID
  myPageUrl: string | null;
  entryDate: string | null; // ISO8601形式
  nextInterviewDate: string | null; // ISO8601形式
  position: string | null; // 応募職種
  esContent: string | null; // 使用したES
  motivation: string | null; // 志望動機
  notes: string | null; // その他メモ
  status: string; // カスタム可能なステータス
  sortOrder: number; // 手動並び替え用
  createdAt: string;
  updatedAt: string;
}

// 新規作成時の入力データ（IDと日時、ソート順は自動生成）
export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>;

// 更新時の入力データ（部分更新可能）
export type CompanyUpdate = Partial<CompanyInput>;

// 選考イベントの型定義
export interface SelectionEvent {
  id: string;
  companyId: string;
  eventType: string; // ES提出、GD、一次面接など
  eventDate: string | null; // 実施日
  result: string; // 結果待ち、通過、不通過
  notes: string | null; // 内容・メモ
  createdAt: string;
}

// 選考イベント新規作成時の入力データ
export type SelectionEventInput = Omit<SelectionEvent, 'id' | 'createdAt'>;

// 選考イベント更新時の入力データ
export type SelectionEventUpdate = Partial<SelectionEventInput>;
