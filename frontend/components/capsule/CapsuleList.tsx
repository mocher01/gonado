"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CapsuleCard, TimeCapsule } from "./CapsuleCard";
import { CreateCapsuleModal } from "./CreateCapsuleModal";

/**
 * CapsuleList - Time Capsules List Component (Issue #72)
 * =======================================================
 *
 * Lists all time capsules for a node.
 * Groups by locked/unlocked.
 * Shows "X hidden messages" for locked capsules if viewer is goal owner.
 * Allows supporters to create new capsules.
 */

interface CapsuleListProps {
  nodeId: string;
  goalOwnerId: string;
  currentUserId: string | null;
  isGoalOwner: boolean;
  onCreateCapsule?: (content: string, unlockType: "node_complete" | "date", unlockDate?: string) => Promise<void>;
  onUpdateCapsule?: (id: string, content: string) => Promise<void>;
  onDeleteCapsule?: (id: string) => Promise<void>;
  capsules: TimeCapsule[];
  isLoading?: boolean;
}

export function CapsuleList({
  nodeId,
  goalOwnerId,
  currentUserId,
  isGoalOwner,
  onCreateCapsule,
  onUpdateCapsule,
  onDeleteCapsule,
  capsules,
  isLoading = false,
}: CapsuleListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCapsule, setEditingCapsule] = useState<TimeCapsule | null>(null);

  // Group capsules
  const unlockedCapsules = capsules.filter((c) => !c.is_locked);
  const lockedCapsules = capsules.filter((c) => c.is_locked);

  // Check if user is supporter (not owner and logged in)
  const canCreateCapsule = currentUserId && currentUserId !== goalOwnerId;

  const handleEdit = (capsule: TimeCapsule) => {
    setEditingCapsule(capsule);
    setShowCreateModal(true);
  };

  const handleCreate = async (content: string, unlockType: "node_complete" | "date", unlockDate?: string) => {
    if (editingCapsule && onUpdateCapsule) {
      // Update existing
      await onUpdateCapsule(editingCapsule.id, content);
      setEditingCapsule(null);
    } else if (onCreateCapsule) {
      // Create new
      await onCreateCapsule(content, unlockType, unlockDate);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingCapsule(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-3xl"
        >
          {String.fromCodePoint(0x1F48C)}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="capsule-list">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{String.fromCodePoint(0x1F48C)}</span>
          <span>Time Capsules</span>
          {capsules.length > 0 && (
            <span className="text-sm text-purple-400">({capsules.length})</span>
          )}
        </h3>
        {canCreateCapsule && (
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
              color: "#fff",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="create-capsule-btn"
          >
            <span>+</span>
            <span>Create Capsule</span>
          </motion.button>
        )}
      </div>

      {/* Empty state */}
      {capsules.length === 0 && (
        <div className="text-center py-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-5xl mb-3"
          >
            {String.fromCodePoint(0x1F48C)}
          </motion.div>
          <p className="text-slate-400 text-sm mb-4">
            {canCreateCapsule
              ? "No time capsules yet. Be the first to leave one!"
              : "No time capsules for this milestone yet."}
          </p>
          {canCreateCapsule && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                color: "#fff",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create First Capsule
            </motion.button>
          )}
        </div>
      )}

      {/* Unlocked capsules */}
      {unlockedCapsules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
            <span>{String.fromCodePoint(0x1F513)}</span>
            <span>Unlocked ({unlockedCapsules.length})</span>
          </h4>
          <div className="space-y-3">
            {unlockedCapsules.map((capsule) => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                isOwner={isGoalOwner}
                isSender={capsule.sender_id === currentUserId}
                onEdit={handleEdit}
                onDelete={onDeleteCapsule}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked capsules */}
      {lockedCapsules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
            <span>{String.fromCodePoint(0x1F512)}</span>
            <span>Locked ({lockedCapsules.length})</span>
          </h4>

          {/* Hidden count badge for owner */}
          {isGoalOwner && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-3 rounded-xl text-center"
              style={{
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
              data-testid="locked-capsule-hint"
            >
              <div className="text-2xl mb-1">{String.fromCodePoint(0x1F381)}</div>
              <p className="text-sm text-purple-300">
                {lockedCapsules.length} hidden message{lockedCapsules.length !== 1 ? "s" : ""} waiting for you!
              </p>
              <p className="text-xs text-purple-400/60 mt-1">
                Keep going to unlock them
              </p>
            </motion.div>
          )}

          {/* List locked capsules */}
          <div className="space-y-3">
            {lockedCapsules.map((capsule) => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                isOwner={isGoalOwner}
                isSender={capsule.sender_id === currentUserId}
                onEdit={handleEdit}
                onDelete={onDeleteCapsule}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateCapsuleModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleCreate}
        isEditing={!!editingCapsule}
        initialContent={editingCapsule?.content}
        initialUnlockType={editingCapsule?.unlock_type}
        initialUnlockDate={editingCapsule?.unlock_date}
      />
    </div>
  );
}
