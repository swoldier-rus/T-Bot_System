import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/core/database-service';
import { EventBus } from '../src/core/event-bus';
import { SharedState } from '../src/core/shared-state';
import { StreamManager } from '../src/core/stream-manager';

describe('DatabaseService (SQLite default_tickers)', () => {
  const envFallback = ['SBER', 'GAZP', 'LKOH', 'GMKN', 'ROSN'];

  it('starts empty and falls back to provided env tickers', () => {
    const db = new DatabaseService({ dbPath: ':memory:' });
    expect(db.getDefaultTickers()).toEqual([]);
    expect(db.hasCustomDefaultTickers()).toBe(false);
    expect(db.getEffectiveDefaultTickers(envFallback)).toEqual(envFallback);
    db.close();
  });

  it('sets custom tickers atomically, deduplicates and normalizes to uppercase', () => {
    const db = new DatabaseService({ dbPath: ':memory:' });
    db.setDefaultTickers(['sber', 'GAZP', 'sber', '  lkoh  ', '']);
    expect(db.getDefaultTickers()).toEqual(['SBER', 'GAZP', 'LKOH']);
    expect(db.hasCustomDefaultTickers()).toBe(true);
    expect(db.getEffectiveDefaultTickers(envFallback)).toEqual(['SBER', 'GAZP', 'LKOH']);
    db.close();
  });

  it('adds and removes single tickers', () => {
    const db = new DatabaseService({ dbPath: ':memory:' });
    db.setDefaultTickers(['SBER', 'GAZP']);
    db.addTicker('nvtk');
    expect(db.getDefaultTickers()).toContain('NVTK');
    expect(db.hasCustomDefaultTickers()).toBe(true);

    db.removeTicker('GAZP');
    expect(db.getDefaultTickers()).not.toContain('GAZP');
    expect(db.getDefaultTickers()).toContain('SBER');
    expect(db.getDefaultTickers()).toContain('NVTK');
    db.close();
  });

  it('clears database list and cleanly reverts to fallback env tickers', () => {
    const db = new DatabaseService({ dbPath: ':memory:' });
    db.setDefaultTickers(['SBER', 'GAZP']);
    expect(db.hasCustomDefaultTickers()).toBe(true);

    db.clearDefaultTickers();
    expect(db.getDefaultTickers()).toEqual([]);
    expect(db.hasCustomDefaultTickers()).toBe(false);
    expect(db.getEffectiveDefaultTickers(envFallback)).toEqual(envFallback);
    db.close();
  });

  it('integrates with StreamManager to update and reset default universe', async () => {
    const eventBus = new EventBus();
    const sharedState = new SharedState();
    const db = new DatabaseService({ dbPath: ':memory:' });
    const streamManager = new StreamManager(eventBus, sharedState, db);

    let emittedTickers: string[] | null = null;
    eventBus.on('system:default_tickers_updated', (effective) => {
      emittedTickers = effective;
    });

    // Update with 3 custom tickers
    await streamManager.updateDefaultTickers(['SBER', 'TATN', 'MOEX']);
    expect(emittedTickers).toEqual(['SBER', 'TATN', 'MOEX']);
    expect(streamManager.getDatabaseService().hasCustomDefaultTickers()).toBe(true);

    // Reset back to fallback
    await streamManager.resetDefaultTickers();
    expect(emittedTickers).toBeDefined();
    expect(streamManager.getDatabaseService().hasCustomDefaultTickers()).toBe(false);
    expect(streamManager.getDatabaseService().getEffectiveDefaultTickers(['SBER', 'GAZP'])).toEqual(['SBER', 'GAZP']);

    db.close();
  });
});
