import { ApiError, deadline } from './http.mjs';
import { validEmail } from './validation.mjs';
export function notification(payload, config) {
  if (!validEmail(config.from) || !validEmail(config.to) || !validEmail(payload.email)
    || /[\r\n\x00]/.test(payload.name)) throw new ApiError(400, 'INVALID_NOTIFICATION');
  return {
    from: config.from, to: config.to, replyTo: payload.email,
    subject: 'Bashiiin! coffee お問い合わせ',
    text: `お名前：${payload.name}\nメールアドレス：${payload.email}\n\nお問い合わせ内容：\n${payload.message}`,
  };
}
// Cloudflare Email Service's structured send() API. No raw MIME/header interpolation.
export async function sendNotification(binding, message, timeout = 5000) {
  try {
    const receipt = await deadline(() => binding.send(message), timeout);
    if (typeof receipt?.messageId !== 'string' || !receipt.messageId.trim()) throw new Error('not accepted');
  } catch { throw new ApiError(503, 'MAIL_UNAVAILABLE'); }
  // Accepted by the service; inbox delivery must be verified separately.
}
