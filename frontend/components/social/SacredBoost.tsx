"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SacredBoost - Rare Meaningful Support (3/month)
 * ================================================
 *
 * A sacred boost is a rare and meaningful way to support someone.
 * Users only get 3 per month, making each one special.
 */

interface SacredBoostProps {
  goalId: string;
  boostsRemaining: number;
  alreadyBoosted: boolean;
  totalBoostsReceived: number;
  boosters: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  }>;
  onBoost: () => void;
  disabled?: boolean;
}

export function SacredBoost({
  goalId,
  boostsRemaining,
  alreadyBoosted,
  totalBoostsReceived,
  boosters,
  onBoost,
  disabled = false,
}: SacredBoostProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBoosters, setShowBoosters] = useState(false);

  const canBoost = boostsRemaining > 0 && !alreadyBoosted && !disabled;

  return (
    <div className="relative">
      {/* Main boost display */}
      <div className="flex items-center gap-3">
        {/* Boost count with glow effect */}
        <motion.div
          className={`relative px-4 py-2 rounded-xl flex items-center gap-2 ${
            totalBoostsReceived > 0
              ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
              : "bg-slate-800/50 border border-white/5"
          }`}
          animate={
            totalBoostsReceived > 0
              ? {
                  boxShadow: [
                    "0 0 0px rgba(245, 158, 11, 0)",
                    "0 0 20px rgba(245, 158, 11, 0.3)",
                    "0 0 0px rgba(245, 158, 11, 0)",
                  ],
                }
              : {}
          }
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-xl">⚡</span>
          <div>
            <div className="text-lg font-bold text-amber-400">
              {totalBoostsReceived}
            </div>
            <div className="text-xs text-slate-400">Sacred Boosts</div>
          </div>
        </motion.div>

        {/* Boost button or status */}
        {alreadyBoosted ? (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <span>✓</span>
            <span>Boosted</span>
          </div>
        ) : (
          <motion.button
            onClick={() => canBoost && setShowConfirm(true)}
            disabled={!canBoost}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              canBoost
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            whileHover={canBoost ? { scale: 1.02 } : {}}
            whileTap={canBoost ? { scale: 0.98 } : {}}
          >
            <span>⚡</span>
            <span>Give Sacred Boost</span>
            <span className="opacity-60">({boostsRemaining}/3)</span>
          </motion.button>
        )}

        {/* View boosters button */}
        {boosters.length > 0 && (
          <button
            onClick={() => setShowBoosters(!showBoosters)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            View boosters
          </button>
        )}
      </div>

      {/* Boosters list */}
      <AnimatePresence>
        {showBoosters && boosters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-white/5"
          >
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Sacred Boosters
            </h4>
            <div className="flex flex-wrap gap-2">
              {boosters.map((booster) => (
                <div
                  key={booster.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-yellow-600">
                    {booster.avatarUrl ? (
                      <img
                        src={booster.avatarUrl}
                        alt={booster.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {booster.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-amber-300">
                    {booster.displayName || booster.username}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4 p-6 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <motion.div
                  className="text-5xl mb-4"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  ⚡
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Give Sacred Boost?
                </h3>
                <p className="text-slate-400 mb-4">
                  You have <strong className="text-amber-400">{boostsRemaining}</strong> sacred boosts
                  remaining this month. Each boost is rare and meaningful.
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
                  <p className="text-sm text-amber-300">
                    This will award <strong>+50 XP</strong> to the quest owner and
                    show your support prominently on their journey.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={() => {
                      onBoost();
                      setShowConfirm(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold hover:from-amber-600 hover:to-yellow-600 transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>⚡</span>
                    <span>Give Boost</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact boost badge for headers
 */
export function SacredBoostBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) return null;

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30"
      animate={{
        boxShadow: [
          "0 0 0px rgba(245, 158, 11, 0)",
          "0 0 10px rgba(245, 158, 11, 0.2)",
          "0 0 0px rgba(245, 158, 11, 0)",
        ],
      }}
      transition={{ repeat: Infinity, duration: 2 }}
      whileHover={{ scale: 1.05 }}
    >
      <span>⚡</span>
      <span className="text-xs font-bold text-amber-400">{count}</span>
    </motion.button>
  );
}
