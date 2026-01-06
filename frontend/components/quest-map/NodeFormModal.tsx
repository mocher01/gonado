"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Node, ChecklistItem, NodeType } from "@/types";

interface NodeFormModalProps {
  node: Node | null; // null = create mode, Node = edit mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    node_type: NodeType;
    estimated_duration: number | null;
    checklist: ChecklistItem[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  mode: "create" | "edit";
  nodeCount?: number; // Used for auto-ordering new nodes
}

const NODE_TYPE_OPTIONS: { value: NodeType; label: string; icon: string }[] = [
  { value: "task", label: "Task", icon: "📋" },
  { value: "milestone", label: "Milestone", icon: "🎯" },
];

export function NodeFormModal({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete,
  mode,
  nodeCount = 0,
}: NodeFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nodeType, setNodeType] = useState<NodeType>("task");
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state when node changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (node && mode === "edit") {
        setTitle(node.title);
        setDescription(node.description || "");
        setNodeType(node.node_type || "task");
        setEstimatedDuration(node.estimated_duration?.toString() || "");
        setChecklist(node.extra_data?.checklist || []);
      } else {
        // Create mode - reset fields
        setTitle("");
        setDescription("");
        setNodeType("task");
        setEstimatedDuration("");
        setChecklist([]);
      }
      setNewItemText("");
      setShowDeleteConfirm(false);
    }
  }, [node, isOpen, mode]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewItemText("");
  };

  const handleRemoveItem = (itemId: string) => {
    setChecklist(checklist.filter((item) => item.id !== itemId));
  };

  const handleUpdateItemText = (itemId: string, text: string) => {
    setChecklist(
      checklist.map((item) => (item.id === itemId ? { ...item, text } : item))
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        node_type: nodeType,
        estimated_duration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        checklist,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!saving && !deleting) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="node-form-modal"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {mode === "create" ? "Add New Step" : "Edit Step"}
              </h2>
              <button
                onClick={handleClose}
                disabled={saving || deleting}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="node-title"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors"
                  placeholder="Step title..."
                />
              </div>

              {/* Node Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNodeType(option.value)}
                      data-testid={`node-type-${option.value}`}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        nodeType === option.value
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="node-description"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors resize-none"
                  placeholder="Brief description..."
                />
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Estimated Duration (hours)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  min="0"
                  data-testid="node-duration"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors"
                  placeholder="e.g., 2"
                />
              </div>

              {/* Checklist */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Checklist Items ({checklist.length})
                </label>

                {/* Existing items */}
                <div className="space-y-2 mb-3">
                  {checklist.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <span className="text-gray-500 text-sm w-6">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          handleUpdateItemText(item.id, e.target.value)
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                      />
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new item */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 outline-none transition-colors"
                    placeholder="Add checklist item..."
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Delete Confirmation */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 py-4 bg-red-500/10 border-t border-red-500/20"
                >
                  <p className="text-red-300 text-sm mb-3">
                    Are you sure you want to delete this step? This action cannot
                    be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      data-testid="confirm-delete"
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Delete Step</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
              {/* Delete button (only in edit mode) */}
              <div>
                {mode === "edit" && onDelete && !showDeleteConfirm && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || deleting}
                    data-testid="delete-node-btn"
                    className="px-4 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  disabled={saving || deleting}
                  className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting || !title.trim()}
                  data-testid="save-node-btn"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{mode === "create" ? "Add Step" : "Save Changes"}</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
