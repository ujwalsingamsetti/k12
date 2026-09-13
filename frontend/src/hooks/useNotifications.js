import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from '../services/api';
import { NOTIFICATION_POLL_INTERVAL_MS } from '../constants/config';

/**
 * Custom hook to handle real-time notification polling, reading, and clearing
 */
export function useNotifications(enabled = true) {
  const [data, setData] = useState({ unread_count: 0, notifications: [] });
  const timerRef = useRef(null);

  const fetchList = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await getNotifications();
      setData(res.data || { unread_count: 0, notifications: [] });
    } catch (_err) {
      // Background poll failure silently swallowed
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;

    getNotifications()
      .then((res) => {
        if (isMounted) {
          setData(res.data || { unread_count: 0, notifications: [] });
        }
      })
      .catch(() => {});

    timerRef.current = setInterval(() => {
      getNotifications()
        .then((res) => {
          if (isMounted) {
            setData(res.data || { unread_count: 0, notifications: [] });
          }
        })
        .catch(() => {});
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setData((prev) => ({
        ...prev,
        unread_count: Math.max(0, (prev.unread_count || 1) - 1),
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      }));
    } catch (_err) {
      // Revert or log
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setData((prev) => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
      }));
    } catch (_err) {
      // Revert or log
    }
  };

  const clearAll = async () => {
    try {
      await clearAllNotifications();
      setData({ unread_count: 0, notifications: [] });
    } catch (_err) {
      // Revert or log
    }
  };

  return {
    unreadCount: data.unread_count || 0,
    notifications: data.notifications || [],
    refresh: fetchList,
    markAsRead,
    markAll,
    clearAll,
  };
}

export default useNotifications;
