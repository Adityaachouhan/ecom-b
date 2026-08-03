import { type NotificationTemplate } from '../store/db.js';
type NotifData = Record<string, unknown> & {
    refId?: string;
    title?: string;
    body?: string;
};
declare function defaultTemplates(): NotificationTemplate[];
/** Ensure in-memory + DB have default templates (idempotent). */
export declare function ensureNotificationTemplates(): Promise<void>;
export declare function hasNotificationLog(eventType: string, refId: string): boolean;
/**
 * Central notification entry point — all modules must call this instead of
 * creating Notification rows directly.
 */
export declare function sendNotification(eventType: string, userId: string, data?: NotifData): Promise<void>;
export declare function checkReviewReminders(): Promise<void>;
export declare function startNotificationScheduler(): void;
export { defaultTemplates };
