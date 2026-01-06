'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'gonado-pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return; // Don't show banner if dismissed within the last 7 days
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the custom install banner
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log('[PWA] App was installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowBanner(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    // Store dismissal time in localStorage
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowBanner(false);
    setDeferredPrompt(null);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(20, 184, 166, 0.3)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Install Gonado
        </p>
        <p
          style={{
            margin: '4px 0 0 0',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          Add to your home screen for the best experience
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: '8px 16px',
            backgroundColor: '#14b8a6',
            border: 'none',
            borderRadius: '8px',
            color: '#0f172a',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0d9488';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#14b8a6';
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
