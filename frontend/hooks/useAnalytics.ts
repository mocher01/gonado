"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";

/**
 * Hook that automatically tracks page views when the pathname changes
 */
export function useAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      analytics.page(pathname);
    }
  }, [pathname]);

  return analytics;
}
