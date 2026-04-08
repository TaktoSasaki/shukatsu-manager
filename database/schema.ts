import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'shukatsu.db';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(database);
      db = database;
      return database;
    })();
  }
  return dbInitPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY NOT NULL,
      companyName TEXT NOT NULL,
      loginId TEXT,
      myPageUrl TEXT,
      entryDate TEXT,
      nextInterviewDate TEXT,
      position TEXT,
      esContent TEXT,
      motivation TEXT,
      notes TEXT,
      transcription TEXT,
      status TEXT NOT NULL DEFAULT '未エントリー',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      calendarEventId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const migrationStatements = [
    'ALTER TABLE companies ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE companies ADD COLUMN loginId TEXT;',
    'ALTER TABLE companies ADD COLUMN transcription TEXT;',
    'ALTER TABLE companies ADD COLUMN calendarEventId TEXT;',
  ];

  for (const statement of migrationStatements) {
    try {
      await database.execAsync(statement);
    } catch {
      // Column already exists.
    }
  }

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);

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

  // Migrate event results: 合格→通過, 不合格→不通過
  await database.execAsync("UPDATE selection_events SET result = '通過' WHERE result = '合格';");
  await database.execAsync("UPDATE selection_events SET result = '不通過' WHERE result = '不合格';");
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DROP TABLE IF EXISTS selection_events');
  await database.execAsync('DROP TABLE IF EXISTS companies');
  await database.execAsync('DROP TABLE IF EXISTS custom_statuses');
  await initializeDatabase(database);
}
