import {
  db,
  type NotificationChannel,
  type NotificationTemplate,
} from '../store/db.js'
import { saveNotification, saveNotificationLog, saveNotificationTemplate } from '../store/persist.js'
import { generateId, nowISO } from '../utils/helpers.js'

type NotifData = Record<string, unknown> & { refId?: string; title?: string; body?: string }

const EVENT_TEMPLATES: Array<{
  eventType: string
  subject: string
  body: string
}> = [
  {
    eventType: 'order_placed',
    subject: 'Order placed',
    body: 'Your order {{orderId}} has been placed. Total: ₹{{total}}.',
  },
  {
    eventType: 'order_confirmed',
    subject: 'Order confirmed',
    body: 'Your order {{orderId}} is confirmed and being prepared.',
  },
  {
    eventType: 'shipment_created',
    subject: 'Shipment created',
    body: 'Your order {{orderId}} has shipped via {{providerName}}. Tracking: {{awbNumber}} {{trackingUrl}}',
  },
  {
    eventType: 'out_for_delivery',
    subject: 'Out for delivery',
    body: 'Your order {{orderId}} is out for delivery. OTP: {{otp}}',
  },
  {
    eventType: 'order_delivered',
    subject: 'Order delivered',
    body: 'Your order {{orderId}} has been delivered. Thank you for shopping with Riviraa!',
  },
  {
    eventType: 'review_request',
    subject: 'How was your order?',
    body: 'Please review your recent order {{orderId}}. Your feedback helps other shoppers.',
  },
  {
    eventType: 'order_failed_returned',
    subject: 'Order update',
    body: 'Update on order {{orderId}}: {{message}}',
  },
  {
    eventType: 'low_stock',
    subject: 'Low stock alert',
    body: 'Product {{productName}} ({{productId}}) is low on stock: {{stock}} units remaining.',
  },
  {
    eventType: 'kyc_approved',
    subject: 'KYC approved',
    body: 'Your KYC has been approved. You can now go online and accept deliveries.',
  },
  {
    eventType: 'kyc_rejected',
    subject: 'KYC rejected',
    body: 'Your KYC was rejected: {{reason}}',
  },
  {
    eventType: 'payout_processed',
    subject: 'Payout processed',
    body: 'Your payout of ₹{{amount}} for period {{period}} has been processed.',
  },
  {
    eventType: 'delivery_assigned',
    subject: 'New delivery assigned',
    body: 'Order {{orderId}} assigned to you. Accept within 5 minutes.',
  },
]

function render(template: string, data: NotifData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key]
    return val === undefined || val === null ? '' : String(val)
  })
}

function defaultTemplates(): NotificationTemplate[] {
  const channels: NotificationChannel[] = ['push', 'email', 'sms']
  const out: NotificationTemplate[] = []
  for (const ev of EVENT_TEMPLATES) {
    for (const channel of channels) {
      out.push({
        id: `ntpl_${ev.eventType}_${channel}`,
        eventType: ev.eventType,
        channel,
        subject: ev.subject,
        bodyTemplate: ev.body,
      })
    }
  }
  return out
}

/** Ensure in-memory + DB have default templates (idempotent). */
export async function ensureNotificationTemplates() {
  const defaults = defaultTemplates()
  if (!db.notificationTemplates.length) {
    db.notificationTemplates.push(...defaults)
  } else {
    for (const t of defaults) {
      const exists = db.notificationTemplates.find(
        (x) => x.eventType === t.eventType && x.channel === t.channel
      )
      if (!exists) db.notificationTemplates.push(t)
    }
  }
  for (const t of db.notificationTemplates) {
    await saveNotificationTemplate(t).catch(() => undefined)
  }
}

export function hasNotificationLog(eventType: string, refId: string): boolean {
  return db.notificationLogs.some((l) => l.eventType === eventType && l.refId === refId)
}

/**
 * Central notification entry point — all modules must call this instead of
 * creating Notification rows directly.
 */
export async function sendNotification(
  eventType: string,
  userId: string,
  data: NotifData = {}
) {
  if (!userId) return

  const refId = data.refId ? String(data.refId) : undefined
  let templates = db.notificationTemplates.filter((t) => t.eventType === eventType)

  if (!templates.length) {
    templates = [
      {
        id: generateId('ntpl'),
        eventType,
        channel: 'push',
        subject: data.title ? String(data.title) : eventType.replace(/_/g, ' '),
        bodyTemplate: data.body ? String(data.body) : JSON.stringify(data),
      },
    ]
  }

  for (const template of templates) {
    const subject = render(template.subject || eventType, data).trim() || eventType
    const body = render(template.bodyTemplate, data).trim()

    const log = {
      id: generateId('nlog'),
      userId,
      eventType,
      channel: template.channel,
      status: 'sent' as const,
      sentAt: nowISO(),
      refId,
    }
    db.notificationLogs.unshift(log)
    await saveNotificationLog(log).catch(() => undefined)

    if (template.channel === 'push') {
      const notif = {
        id: generateId('notif'),
        userId,
        title: subject,
        body,
        read: false,
        createdAt: nowISO(),
        type: eventType.split('_')[0] || 'general',
      }
      db.notifications.unshift(notif)
      await saveNotification(notif).catch(() => undefined)
    } else if (template.channel === 'email') {
      console.log(`[notif:email] to=${userId} event=${eventType} subject="${subject}" body="${body}"`)
    } else if (template.channel === 'sms') {
      console.log(`[notif:sms] to=${userId} event=${eventType} body="${body}"`)
    }
  }
}

const REVIEW_MS = 24 * 60 * 60 * 1000

export async function checkReviewReminders() {
  const now = Date.now()
  const due = db.orders.filter((o) => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false
    if (now - new Date(o.deliveredAt).getTime() < REVIEW_MS) return false
    return !hasNotificationLog('review_request', o.id)
  })

  for (const order of due) {
    await sendNotification('review_request', order.customerId, {
      orderId: order.id,
      refId: order.id,
    })
  }
}

export function startNotificationScheduler() {
  setInterval(() => {
    void checkReviewReminders().catch((err) =>
      console.error('Review reminder check failed:', err)
    )
  }, 30_000)
}

export { defaultTemplates }
