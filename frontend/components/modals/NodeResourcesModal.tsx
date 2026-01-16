"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface Resource {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  message: string | null;
  resources: Array<{ url: string; title: string; type: string }>;
  created_at: string;
  is_opened: boolean;
}

interface NodeResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
  isOwner: boolean;  // Owner can't drop resources on their own goal
  onDataChanged?: () => void;  // Callback when data changes (resource added)
}

export function NodeResourcesModal({
  isOpen,
  onClose,
  nodeId,
  nodeTitle,
  isOwner,
  onDataChanged,
}: NodeResourcesModalProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({ title: "", url: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadResources();
    }
  }, [isOpen, nodeId]);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const response = await api.getNodeDrops(nodeId);
      setResources(response.drops || []);
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newResource.title.trim() || !newResource.url.trim()) return;

    setIsSubmitting(true);
    try {
      await api.dropResource(nodeId, {
        url: newResource.url,
        title: newResource.title,
        description: newResource.message || undefined,
      });
      setNewResource({ title: "", url: "", message: "" });
      setShowAddForm(false);
      loadResources();
      onDataChanged?.(); // Notify parent to refresh counts
    } catch (error: any) {
      console.error("Failed to drop resource:", error);
      alert(error.message || "Failed to drop resource. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-y-[10vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  📦 Resources
                </h2>
                <p className="text-sm text-slate-400 truncate max-w-[250px]">for &quot;{nodeTitle}&quot;</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Resources list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="text-center text-slate-400 py-8">Loading resources...</div>
              ) : resources.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <span className="text-4xl mb-2 block">📦</span>
                  <p>No resources yet</p>
                  <p className="text-sm">Be the first to share something helpful!</p>
                </div>
              ) : (
                resources.map(drop => (
                  <div key={drop.id} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs">
                        👤
                      </div>
                      <span className="font-medium text-teal-400">
                        {drop.display_name || `@${drop.username}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(drop.created_at)}
                      </span>
                    </div>
                    {drop.message && (
                      <p className="text-sm text-slate-400 pl-8 mb-2 italic">&quot;{drop.message}&quot;</p>
                    )}
                    <div className="pl-8 space-y-1">
                      {drop.resources.map((r, i) => (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {r.type === 'file' ? '📄' : '🔗'}
                          <span className="underline">{r.title}</span>
                          <span className="text-xs text-slate-500">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add resource section */}
            {!isOwner && (
              <div className="p-4 border-t border-white/10 bg-slate-800">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    🔗 Drop a Resource
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newResource.title}
                      onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Resource title *"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="url"
                      value={newResource.url}
                      onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="URL (https://...) *"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      value={newResource.message}
                      onChange={(e) => setNewResource(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Message (optional)"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !newResource.title.trim() || !newResource.url.trim()}
                        className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                      >
                        {isSubmitting ? "..." : "Drop 📤"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Owner notice */}
            {isOwner && (
              <div className="p-4 border-t border-white/10 bg-slate-800/50">
                <p className="text-sm text-slate-500 text-center">
                  💡 Resources are dropped by supporters to help you on your journey
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
