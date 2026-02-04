import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'shukatsu.db';

let db: SQLite.SQLiteDatabase | null = null;

// データベース接続を取得
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(db);
  }
  return db;
}

// テーブル作成
async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // 企業テーブル
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY NOT NULL,
      companyName TEXT NOT NULL,
      myPageUrl TEXT,
      entryDate TEXT,
      nextInterviewDate TEXT,
      position TEXT,
      esContent TEXT,
      motivation TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT '未エントリー',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // sortOrderカラムが存在しない場合は追加（マイグレーション）
  try {
    await database.execAsync(`ALTER TABLE companies ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // カラムが既に存在する場合は無視
  }

  // loginIdカラムが存在しない場合は追加（マイグレーション）
  try {
    await database.execAsync(`ALTER TABLE companies ADD COLUMN loginId TEXT;`);
  } catch (e) {
    // カラムが既に存在する場合は無視
  }

  // カスタムステータステーブル（ユーザーが追加したステータスを保存）
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);

  // 選考イベントテーブル（選考履歴を記録）
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS selection_events (
      id TEXT PRIMARY KEY NOT NULL,
      companyId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      eventDate TEXT,
      result TEXT NOT NULL DEFAULT '結果待ち',
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);
}

// データベースをリセット（開発用）
export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DROP TABLE IF EXISTS companies');
  await database.execAsync('DROP TABLE IF EXISTS custom_statuses');
  await initializeDatabase(database);
}
