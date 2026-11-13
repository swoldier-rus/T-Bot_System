import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { IndicatorParams } from '../types/market';

export interface DatabaseServiceOptions {
  dbPath?: string;
}

export class DatabaseService {
  private db: DatabaseSync;

  constructor(options?: DatabaseServiceOptions) {
    const defaultPath = path.join(process.cwd(), 'data', 'settings.db');
    const targetPath = options?.dbPath || defaultPath;

    // Ensure directory exists if not an in-memory database
    if (targetPath !== ':memory:') {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(targetPath);
    this.initSchema();
    this.initIndicatorParamsSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS default_tickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT UNIQUE NOT NULL,
        added_at INTEGER NOT NULL
      );
    `);
    // Safe migration: ensure column id exists in case an old table existed
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info('default_tickers')").all() as Array<{ name: string }>;
      const hasId = tableInfo.some((col) => col.name === 'id');
      if (!hasId) {
        this.db.exec('DROP TABLE default_tickers;');
        this.db.exec(`
          CREATE TABLE default_tickers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT UNIQUE NOT NULL,
            added_at INTEGER NOT NULL
          );
        `);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Returns list of custom default tickers stored in SQLite.
   */
  public getDefaultTickers(): string[] {
    const stmt = this.db.prepare('SELECT ticker FROM default_tickers ORDER BY id ASC');
    const rows = stmt.all() as Array<{ ticker: string }>;
    return rows.map((r) => r.ticker.toUpperCase());
  }

  /**
   * Atomically replaces entire default tickers table.
   */
  public setDefaultTickers(tickers: string[]): void {
    const cleanTickers = Array.from(
      new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))
    );

    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec('DELETE FROM default_tickers;');
      const insertStmt = this.db.prepare('INSERT INTO default_tickers (ticker, added_at) VALUES (?, ?);');
      const now = Date.now();
      for (const t of cleanTickers) {
        insertStmt.run(t, now);
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Adds single ticker to custom default list.
   */
  public addTicker(ticker: string): void {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;
    const stmt = this.db.prepare('INSERT OR IGNORE INTO default_tickers (ticker, added_at) VALUES (?, ?);');
    stmt.run(clean, Date.now());
  }

  /**
   * Removes single ticker from custom default list.
   */
  public removeTicker(ticker: string): void {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;
    const stmt = this.db.prepare('DELETE FROM default_tickers WHERE ticker = ?;');
    stmt.run(clean);
  }

  /**
   * Clears database custom default tickers table.
   */
  public clearDefaultTickers(): void {
    this.db.exec('DELETE FROM default_tickers;');
  }

  /**
   * Returns whether database holds at least one custom default ticker.
   */
  public hasCustomDefaultTickers(): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM default_tickers;');
    const row = stmt.get() as { cnt: number } | undefined;
    return !!row && row.cnt > 0;
  }

  /**
   * Returns effective default tickers:
   * If database has custom tickers, returns database list.
   * Otherwise falls back to provided env tickers.
   */
  public getEffectiveDefaultTickers(fallbackEnvTickers: string[]): string[] {
    const custom = this.getDefaultTickers();
    if (custom.length > 0) {
      return custom;
    }
    return fallbackEnvTickers.map((t) => t.toUpperCase());
  }

  /**
   * Close SQLite database connection.
   */
    private initIndicatorParamsSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS indicator_params (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        params_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  public getIndicatorParams(): Partial<IndicatorParams> | null {
    try {
      const stmt = this.db.prepare('SELECT params_json FROM indicator_params WHERE id = 1;');
      const row = stmt.get() as { params_json: string } | undefined;
      if (row && row.params_json) {
        return JSON.parse(row.params_json);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public setIndicatorParams(params: Partial<IndicatorParams>): void {
    try {
      const existing = this.getIndicatorParams() || {};
      const merged = { ...existing, ...params };
      const stmt = this.db.prepare(`
        INSERT INTO indicator_params (id, params_json, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET params_json = excluded.params_json, updated_at = excluded.updated_at;
      `);
      stmt.run(JSON.stringify(merged), Date.now());
    } catch (e) {
      console.error('Failed to save indicator params to SQLite', e);
    }
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // ignore on shutdown
    }
  }
}
