'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function OnlineStatusPinger() {
  const { userInfo } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userInfo?.username) return;

    const sendPing = async (action: string = 'active') => {
      try {
        await fetch('/api/users/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userInfo.username,
            action
          })
        });
      } catch (error) {
      }
    };

    sendPing('page_load');

    intervalRef.current = setInterval(() => {
      sendPing('active');
    }, 2 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendPing('tab_focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      sendPing('page_unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userInfo?.username]);

  return null;
}
