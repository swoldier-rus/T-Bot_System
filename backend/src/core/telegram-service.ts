import https from 'https';
import { MarketSignal } from '../types/signals';
import { EventBus } from './event-bus';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  cooldownMinutes: number;
}

export class TelegramService {
  private config: TelegramConfig = {
    enabled: false,
    botToken: '',
    chatId: '',
    cooldownMinutes: 15,
  };

  // Cooldown tracker: ticker -> lastSentTimestamp
  private readonly lastSentTimestamps = new Map<string, number>();
  private lastErrorLogTime = 0;

  constructor(private readonly eventBus?: EventBus) {
    // Note: Autonomous event-bus listening removed.
    // The server operates strictly as a centralized dispatch relay on frontend command.
  }

  public getConfig(): TelegramConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.info(
      `📱 [Telegram] Config updated. Enabled: ${this.config.enabled}, ChatId: ${this.config.chatId ? 'configured' : 'none'}`
    );
  }

  public async sendSignalAlert(
    signal: MarketSignal,
    ignoreCooldown = true
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.botToken || !this.config.chatId) {
      return { success: false, error: 'Telegram botToken or chatId not configured' };
    }

    if (!ignoreCooldown) {
      const ticker = signal.ticker.toUpperCase();
      const now = Date.now();
      const lastSent = this.lastSentTimestamps.get(ticker) || 0;
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000;

      if (now - lastSent < cooldownMs) {
        return { success: false, error: `Cooldown active for ${ticker}` };
      }
      this.lastSentTimestamps.set(ticker, now);
    }

    const isLong = signal.direction === 'LONG';
    const icon = isLong ? '🟢' : signal.direction === 'SHORT' ? '🔴' : '⚪';
    const severityBadge =
      signal.severity === 'HIGH' ? '🔥 HIGH' : signal.severity === 'MEDIUM' ? '⚡ MED' : 'ℹ️ LOW';

    const p = signal.payload || {};
    const priceStr = p.price !== undefined ? `${Number(p.price).toFixed(2)} ₽` : '—';
    const rsiStr = p.rsi !== undefined ? Number(p.rsi).toFixed(1) : '—';
    const stochK = p.stochK !== undefined ? Number(p.stochK).toFixed(1) : '—';
    const stochD = p.stochD !== undefined ? Number(p.stochD).toFixed(1) : '—';
    const tfStr = p.timeframe || '5m';
    const reason = p.reason || 'REVERSAL_EXTREME';

    const text = [
      `${icon} <b>MOEX Screener Alert: ${signal.ticker}</b> [${severityBadge}]`,
      `🎯 <b>Направление:</b> ${signal.direction} (${tfStr})`,
      `💰 <b>Цена:</b> ${priceStr}`,
      `📊 <b>RSI:</b> ${rsiStr} | <b>Slow %K/%D:</b> ${stochK} / ${stochD}`,
      `📌 <b>Причина:</b> <code>${reason}</code>`,
      `⏰ <i>${new Date(signal.timestamp).toLocaleTimeString('ru-RU')}</i>`,
    ].join('\n');

    return this.sendMessage(text);
  }

  public async sendMessage(htmlText: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.botToken || !this.config.chatId) {
      return { success: false, error: 'Telegram botToken or chatId not configured' };
    }

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        chat_id: this.config.chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.config.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            console.error(`⚠️ [Telegram API Error] Status ${res.statusCode}:`, body);
            resolve({ success: false, error: `Telegram HTTP ${res.statusCode}: ${body}` });
          }
        });
      });

      req.on('error', (err) => {
        const now = Date.now();
        if (now - this.lastErrorLogTime > 60000) {
          console.warn('⚠️ [Telegram Network Note]:', err.message);
          this.lastErrorLogTime = now;
        }
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(postData);
      req.end();
    });
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.botToken || !this.config.chatId) {
      return { success: false, error: 'Token or Chat ID not configured' };
    }

    try {
      const res = await this.sendMessage(
        '🔔 <b>MOEX Screener Pro:</b> Тестовое сообщение успешно доставлено с бэкенда!'
      );
      return res;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
