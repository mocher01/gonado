'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ServiceWorkerRegister = dynamic(() => import("@/components/pwa").then(mod => ({ default: mod.ServiceWorkerRegister })), { ssr: false });
const InstallPrompt = dynamic(() => import("@/components/pwa").then(mod => ({ default: mod.InstallPrompt })), { ssr: false });
const FeedbackButton = dynamic(() => import("@/components/feedback").then(mod => ({ default: mod.FeedbackButton })), { ssr: false });
const Toaster = dynamic(() => import("react-hot-toast").then(mod => ({ default: mod.Toaster })), { ssr: false });

export function ClientProviders() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <ServiceWorkerRegister />
      <InstallPrompt />
      <FeedbackButton />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#1e293b',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1e293b',
            },
          },
        }}
      />
    </>
  );
}
