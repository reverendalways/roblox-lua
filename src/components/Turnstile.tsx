"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export default function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'dark',
  size = 'normal'
}: TurnstileProps) {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded && turnstileRef.current && window.turnstile && !widgetId) {
      const id = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'error-callback': onError,
        'expired-callback': onExpire,
        theme,
        size,
      });
      setWidgetId(id);
    }
  }, [isLoaded, siteKey, onVerify, onError, onExpire, theme, size, widgetId]);

  const reset = () => {
    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
    }
  };

  useEffect(() => {
    if (turnstileRef.current) {
      (turnstileRef.current as any).reset = reset;
    }
  }, [widgetId]);

  return (
    <div className="flex justify-center">
      <div ref={turnstileRef} />
    </div>
  );
}