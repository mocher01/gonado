"use client";

import { motion } from "framer-motion";
import { useState } from "react";

/**
 * CapsuleCard - Time Capsule Display Card (Issue #72)
 * ===================================================
 *
 * Displays a time capsule with:
 * - Sender name, date, message
 * - Lock icon if locked (hides content for owner)
 * - Edit/delete buttons if viewer is sender
 * - Unlock condition info
 */

export interface TimeCapsule {
  id: string;
  node_id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  content: string;
  unlock_type: "node_complete" | "date";
  unlock_date: string | null;
  is_locked: boolean;
  created_at: string;
  unlocked_at: string | null;
}

interface CapsuleCardProps {
  capsule: TimeCapsule;
  isOwner: boolean; // Is the viewer the owner of the goal/node?
  isSender: boolean; // Is the viewer the sender of this capsule?
  onEdit?: (capsule: TimeCapsule) => void;
  onDelete?: (id: string) => void;
}

export function CapsuleCard({
  capsule,
  isOwner,
  isSender,
  onEdit,
  onDelete,
}: CapsuleCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const senderName = capsule.sender_display_name || capsule.sender_username;
  const isLocked = capsule.is_locked;
  const showContent = !isLocked || isSender;

  // Format unlock condition
  const getUnlockInfo = () => {
    if (!isLocked) {
      return `Unlocked ${new Date(capsule.unlocked_at!).toLocaleDateString()}`;
    }
    if (capsule.unlock_type === "node_complete") {
      return "Unlocks when node is completed";
    }
    if (capsule.unlock_date) {
      return `Unlocks on ${new Date(capsule.unlock_date).toLocaleDateString()}`;
    }
    return "Unlock condition not set";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-xl transition-all"
      style={{
        background: isLocked
          ? "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)"
          : "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)",
        border: isLocked
          ? "1px solid rgba(139, 92, 246, 0.2)"
          : "1px solid rgba(139, 92, 246, 0.3)",
      }}
      data-testid="capsule-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Lock/Envelope Icon */}
          <motion.span
            className="text-2xl"
            animate={isLocked ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            {isLocked ? String.fromCodePoint(0x1F512) : String.fromCodePoint(0x1F48C)}
          </motion.span>

          {/* Sender info */}
          <div className="flex-1">
            <div className="font-medium text-purple-200">
              {isSender ? "You" : senderName}
            </div>
            <div className="text-xs text-purple-400/60">
              {new Date(capsule.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Edit/Delete buttons for sender */}
        {isSender && isLocked && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <motion.button
                onClick={() => onEdit(capsule)}
                className="p-1.5 rounded-lg text-purple-300 hover:bg-purple-500/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Edit capsule"
                data-testid="edit-capsule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </motion.button>
            )}
            {onDelete && (
              <motion.button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Delete capsule"
                data-testid="delete-capsule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Unlock info */}
      <div
        className="text-xs px-2 py-1 rounded-lg mb-3 inline-block"
        style={{
          background: isLocked ? "rgba(139, 92, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
          border: isLocked ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
          color: isLocked ? "#c4b5fd" : "#86efac",
        }}
      >
        {getUnlockInfo()}
      </div>

      {/* Content */}
      {showContent ? (
        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" data-testid="capsule-content">
          {capsule.content}
        </div>
      ) : (
        <div className="text-sm text-purple-400/60 italic" data-testid="capsule-locked">
          {isOwner
            ? String.fromCodePoint(0x1F512) + " This message will be revealed when unlocked"
            : "Message locked"}
        </div>
      )}

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm"
          style={{
            background: "rgba(15, 23, 42, 0.9)",
          }}
        >
          <div className="text-center p-4">
            <p className="text-sm text-slate-200 mb-3">Delete this time capsule?</p>
            <div className="flex gap-2 justify-center">
              <motion.button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(71, 85, 105, 0.5)",
                  color: "#cbd5e1",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={() => {
                  onDelete?.(capsule.id);
                  setShowConfirmDelete(false);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="confirm-delete"
              >
                Delete
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
