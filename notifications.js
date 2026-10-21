import { db, Database } from './db.js';
import { NotifEngine } from './notif-engine.js';
import { NotifUI } from './notif-ui.js';

export const Notifications = {
    ...NotifEngine,
    ...NotifUI,

    markRead: async (id) => {
        await Database.markNotificationRead(id);
        Notifications.updateBadge();
        Notifications.renderList();
    },

    markAllRead: async () => {
        await Database.markAllNotificationsRead();
        Notifications.updateBadge();
        Notifications.renderList();
    },

    delete: async (id) => {
        await Database.remove('notificacoes', id);
        Notifications.updateBadge();
        Notifications.renderList();
    }
};