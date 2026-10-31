import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/event-bus';
import { TelegramService } from '../src/core/telegram-service';
import { MarketSignal } from '../src/types/signals';

describe('TelegramService (Relay Only Mode)', () => {
  it('does not auto-send signals when event bus emits scanner:signal', async () => {
    const eventBus = new EventBus();
    const service = new TelegramService(eventBus);
    service.updateConfig({
      enabled: true,
      botToken: 'fake-token',
      chatId: 'fake-chat-id',
    });

    const sendSpy = vi.spyOn(service, 'sendSignalAlert');

    const fakeSignal: MarketSignal = {
      id: 'sig-1',
      ticker: 'SBER',
      direction: 'LONG',
      severity: 'HIGH',
      timestamp: Date.now(),
      payload: { price: 295, timeframe: '5m' },
    };

    // Emit signal on event bus
    eventBus.emit('scanner:signal', fakeSignal);

    // Verify spy was NEVER called autonomously
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('rejects sending when botToken or chatId is missing', async () => {
    const service = new TelegramService();
    const res = await service.sendMessage('Hello');
    expect(res.success).toBe(false);
    expect(res.error).toContain('not configured');
  });
});
