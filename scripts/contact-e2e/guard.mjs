import { DurableObject } from 'cloudflare:workers';
import { liveApproved, FROM, TO } from './policy.mjs';

// No HTTP handler, reset, alarm or client-supplied slot. This class is internal RPC only.
export class DeliveryGuard extends DurableObject {
  async sendOnce(message) {
    if (!liveApproved(this.env) || typeof this.env.RAW_EMAIL?.send !== 'function') throw Error('E2E_UNAVAILABLE');
    const keys = ['from', 'to', 'replyTo', 'subject', 'text'];
    if (!message || Object.keys(message).length !== keys.length
      || keys.some(k => typeof message[k] !== 'string')
      || message.from !== FROM || message.to !== TO
      || message.subject !== 'Bashiiin! coffee お問い合わせ'
      || /[\r\n\x00]/.test(message.replyTo) || !message.replyTo.includes('@')) throw Error('E2E_INVALID_MAIL');
    // Transaction contains storage operations ONLY. Never send from a transaction callback.
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS attempt (slot INTEGER PRIMARY KEY CHECK(slot = 1))');
      if (this.ctx.storage.sql.exec('SELECT slot FROM attempt WHERE slot = 1').toArray().length) throw Error('E2E_CONSUMED');
      this.ctx.storage.sql.exec('INSERT INTO attempt(slot) VALUES (1)');
    });
    // Explicit durability barrier before accessing the real mail binding. No rollback/retry/reset.
    await this.ctx.storage.sync();
    const receipt = await this.env.RAW_EMAIL.send(message);
    if (typeof receipt?.messageId !== 'string' || !receipt.messageId.trim()) throw Error('E2E_MAIL_UNKNOWN');
    return { messageId: receipt.messageId };
  }
}
