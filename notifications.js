import { db, Database } from './db.js';
import { NotifEngine } from './notif-engine.js';
import { NotifUI } from './notif-ui.js';

export const Notifications = {
    ...NotifEngine,
    ...NotifUI,

    markRead: (id) => {
        Database.markNotificationRead(id);
        Notifications.updateBadge();
        Notifications.renderList();
    },

    markAllRead: () => {
        Database.markAllNotificationsRead();
        Notifications.updateBadge();
        Notifications.renderList();
    },

    delete: (id) => {
        Database.remove('notificacoes', id);
        Notifications.updateBadge();
        Notifications.renderList();
    }
};