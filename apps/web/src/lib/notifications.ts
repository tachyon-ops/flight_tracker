/**
 * Notification Engine — Telegram & Webhook delivery
 *
 * Sends price drop alerts via:
 *   1. Telegram Bot API
 *   2. Generic webhook (for n8n/Make.com/Zapier)
 */

interface AlertPayload {
  route: string;
  date: string;
  currentPrice: number;
  previousPrice: number;
  dropPercent: number;
  source: string;
  bookingUrl?: string;
  isErrorFare?: boolean;
}

/**
 * Send a Telegram message via Bot API.
 *
 * Requires env vars:
 *   TELEGRAM_BOT_TOKEN — BotFather token
 *   TELEGRAM_CHAT_ID   — Target chat/group ID
 */
async function sendTelegram(payload: AlertPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("[Notify] Telegram not configured — skipping");
    return false;
  }

  const emoji = payload.isErrorFare ? "🚨" : payload.dropPercent > 10 ? "🔥" : "📉";
  const priceChangeText = payload.dropPercent > 0
    ? `↓ ${payload.dropPercent.toFixed(1)}%`
    : `↑ ${Math.abs(payload.dropPercent).toFixed(1)}%`;

  const message = [
    `${emoji} *FlightRadar Alert*`,
    ``,
    `*${payload.route}* · ${payload.date}`,
    `$${payload.previousPrice} → *$${payload.currentPrice}* (${priceChangeText})`,
    `Source: ${payload.source}`,
    payload.isErrorFare ? `\n⚡ *Possible error fare — book immediately!*` : "",
    payload.bookingUrl ? `\n[Book now](${payload.bookingUrl})` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("[Notify] Telegram failed:", error);
      return false;
    }

    console.log("[Notify] Telegram sent successfully");
    return true;
  } catch (error) {
    console.error("[Notify] Telegram error:", error);
    return false;
  }
}

/**
 * Send a webhook payload (for n8n/Make.com/Zapier integration).
 */
async function sendWebhook(payload: AlertPayload): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url) {
    return false;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "price_alert",
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Dispatch a price alert to all configured channels.
 */
export async function notify(payload: AlertPayload): Promise<{
  telegram: boolean;
  webhook: boolean;
}> {
  const [telegram, webhook] = await Promise.all([
    sendTelegram(payload),
    sendWebhook(payload),
  ]);

  return { telegram, webhook };
}
