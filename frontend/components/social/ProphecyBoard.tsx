"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ProphecyBoard - Predictions About Quest Completion
 * ===================================================
 *
 * Supporters can predict when the quest owner will complete their goal.
 * Creates engagement and excitement around the journey.
 */

interface Prophecy {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  predictedDate: string;
  accuracyDays?: number | null;
  createdAt: string;
}

interface ProphecyBoardProps {
  goalId: string;
  prophecies: Prophecy[];
  actualCompletion?: string | null;
  closestProphet?: Prophecy | null;
  userProphecy?: Prophecy | null;
  onMakeProphecy: (date: Date) => void;
  isOwner?: boolean;
}

export function ProphecyBoard({
  goalId,
  prophecies,
  actualCompletion,
  closestProphet,
  userProphecy,
  onMakeProphecy,
  isOwner = false,
}: ProphecyBoardProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate) {
      onMakeProphecy(new Date(selectedDate));
      setShowForm(false);
      setSelectedDate("");
    }
  };

  // Calculate prediction range for visualization
  const dates = prophecies.map((p) => new Date(p.predictedDate).getTime());
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now();
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();
  const range = maxDate - minDate || 1;

  const isCompleted = !!actualCompletion;

  return (
    <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            <div>
              <h3 className="text-lg font-bold text-white">Prophecy Board</h3>
              <p className="text-sm text-slate-400">
                {prophecies.length} prediction{prophecies.length !== 1 ? "s" : ""} made
              </p>
            </div>
          </div>

          {!isOwner && !userProphecy && !isCompleted && (
            <motion.button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm font-medium hover:bg-purple-500/30 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🔮 Make Prediction
            </motion.button>
          )}

          {userProphecy && (
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
              Your prediction: {formatDate(userProphecy.predictedDate)}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {prophecies.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">🔮</span>
            <p className="text-slate-400">No predictions yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Be the first to predict when this quest will be completed!
            </p>
          </div>
        ) : (
          <>
            {/* Completion result */}
            {isCompleted && closestProphet && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">🏆</span>
                  <h4 className="font-semibold text-emerald-400">Quest Completed!</h4>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  Completed on <strong>{formatDate(actualCompletion!)}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Closest prediction:</span>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/20">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
                      {closestProphet.avatarUrl ? (
                        <img
                          src={closestProphet.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {closestProphet.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-emerald-300">
                      {closestProphet.displayName || closestProphet.username}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({Math.abs(closestProphet.accuracyDays || 0)} days off)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline visualization */}
            <div className="relative mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                {/* Actual completion marker */}
                {isCompleted && (
                  <div
                    className="absolute top-0 w-1 h-2 bg-emerald-500 z-10"
                    style={{
                      left: `${((new Date(actualCompletion!).getTime() - minDate) / range) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Prediction markers */}
              {prophecies.map((prophecy, index) => {
                const position =
                  ((new Date(prophecy.predictedDate).getTime() - minDate) / range) * 100;
                return (
                  <motion.div
                    key={prophecy.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="absolute -top-1"
                    style={{ left: `${Math.min(Math.max(position, 2), 98)}%` }}
                  >
                    <div className="relative group">
                      <div
                        className={`w-4 h-4 rounded-full border-2 border-slate-900 ${
                          prophecy.id === userProphecy?.id
                            ? "bg-purple-500"
                            : prophecy.id === closestProphet?.id
                            ? "bg-emerald-500"
                            : "bg-slate-500"
                        }`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-slate-900 border border-white/10 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <div className="font-medium text-white">
                          {prophecy.displayName || prophecy.username}
                        </div>
                        <div className="text-slate-400">{formatDate(prophecy.predictedDate)}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Date range labels */}
            <div className="flex justify-between text-xs text-slate-500 mb-4">
              <span>{formatDate(new Date(minDate).toISOString())}</span>
              <span>{formatDate(new Date(maxDate).toISOString())}</span>
            </div>

            {/* Prophecy list */}
            <div className="space-y-2">
              {prophecies.map((prophecy) => (
                <div
                  key={prophecy.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    prophecy.id === userProphecy?.id
                      ? "bg-purple-500/10 border border-purple-500/20"
                      : prophecy.id === closestProphet?.id
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600">
                      {prophecy.avatarUrl ? (
                        <img
                          src={prophecy.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {prophecy.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-white">
                      {prophecy.displayName || prophecy.username}
                    </span>
                    {prophecy.id === closestProphet?.id && (
                      <span className="text-xs text-emerald-400">🎯 Closest!</span>
                    )}
                  </div>
                  <span className="text-sm text-slate-400">
                    {formatDate(prophecy.predictedDate)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Prediction form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4 p-6 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">🔮</span>
                <h3 className="text-xl font-bold text-white">Make Your Prophecy</h3>
                <p className="text-slate-400 mt-1">
                  When do you think this quest will be completed?
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mb-4"
                  required
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold hover:from-purple-600 hover:to-indigo-600 transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>🔮</span>
                    <span>Prophesy</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
