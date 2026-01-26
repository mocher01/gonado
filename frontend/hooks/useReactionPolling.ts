import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface UseReactionPollingOptions {
  goalId: string | null;
  interval?: number;  // default 5000ms
  enabled?: boolean;
  onUpdate?: (data: any) => void;
}

/**
 * Hook to poll for reaction updates on goal nodes.
 * Issue #39: Real-time reaction polling
 *
 * Polls the backend for social data updates and only triggers onUpdate
 * when data has changed (using JSON comparison).
 */
export function useReactionPolling({
  goalId,
  interval = 5000,
  enabled = true,
  onUpdate
}: UseReactionPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);

  const pollData = useCallback(async () => {
    if (!goalId || !enabled || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    try {
      const data = await api.getGoalNodesSocialSummary(goalId);
      const dataString = JSON.stringify(data);

      // Only call onUpdate if data has changed
      if (previousDataRef.current !== dataString) {
        previousDataRef.current = dataString;
        if (onUpdate) {
          onUpdate(data);
        }
      }
    } catch (error) {
      // Silently fail - don't spam console with polling errors
      // The user already has the initial data loaded
    } finally {
      isPollingRef.current = false;
    }
  }, [goalId, enabled, onUpdate]);

  useEffect(() => {
    // Don't start polling if disabled or no goalId
    if (!enabled || !goalId) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start polling
    intervalRef.current = setInterval(pollData, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [goalId, interval, enabled, pollData]);
}
