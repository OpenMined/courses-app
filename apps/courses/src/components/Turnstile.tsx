import React, { useEffect, useRef } from 'react';
import { Box, BoxProps } from '@chakra-ui/react';

// Cloudflare Turnstile: a privacy-preserving check that the visitor is a person.
// The token it produces is verified server-side by the createAccount function.
const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoading: Promise<void> | null = null;

const loadScript = () => {
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Could not load the verification check.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
};

interface TurnstileProps extends BoxProps {
  // Called with a fresh token, or null when it expires or fails
  onToken: (token: string | null) => void;
  // Change this value to get a new token (each token works once)
  resetKey?: number;
}

export default ({ onToken, resetKey, ...props }: TurnstileProps) => {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !container.current) return;
        // @ts-ignore
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: process.env.NX_TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
      // @ts-ignore
      if (widgetId.current && window.turnstile) {
        // @ts-ignore
        window.turnstile.remove(widgetId.current);
      }
    };
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (resetKey && widgetId.current && window.turnstile) {
      onToken(null);
      // @ts-ignore
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  return <Box ref={container} minH="65px" {...props} />;
};
