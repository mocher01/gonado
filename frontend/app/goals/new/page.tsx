"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type MessageRole = "user" | "assistant" | "system";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sequence: number;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
  goal_id: string | null;
  messages: Message[];
}

export default function NewGoalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSequence, setLastSequence] = useState(0);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<"public" | "private">("public");

  // Start or resume conversation
  useEffect(() => {
    if (user && !conversation) {
      startOrResumeConversation();
    }
  }, [user]);

  // Poll for new messages and check for completion
  useEffect(() => {
    if (!conversation) return;
    // Don't poll if already completed
    if (conversation.status === "completed") {
      if (conversation.goal_id) {
        router.push(`/goals/${conversation.goal_id}`);
      }
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        // Always check for new messages
        const newMessages = await api.getChatMessages(conversation.id, lastSequence);
        if (newMessages.length > 0) {
          const maxSeq = Math.max(...newMessages.map(m => m.sequence));
          setConversation(prev => {
            if (!prev) return prev;
            const existingIds = new Set(prev.messages.map(m => m.id));
            const uniqueNew = newMessages
              .filter(m => !existingIds.has(m.id))
              .map(m => ({ ...m, role: m.role as MessageRole }));
            if (uniqueNew.length === 0) return prev;
            return {
              ...prev,
              status: prev.status === "waiting" ? "active" : prev.status,
              messages: [...prev.messages, ...uniqueNew]
            };
          });
          setLastSequence(maxSeq);
        }

        // Check if goal was created (conversation completed)
        // Always check our specific conversation status
        const fullConv = await api.getConversation(conversation.id);
        if (fullConv?.status === "completed" && fullConv.goal_id) {
          // Update state and show visibility selector
          setConversation(prev => prev ? { ...prev, status: "completed", goal_id: fullConv.goal_id } : null);
          setCreatedGoalId(fullConv.goal_id);
          setShowVisibilitySelector(true);
          return;
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [conversation?.id, conversation?.status, conversation?.goal_id, lastSequence, router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const startOrResumeConversation = async () => {
    try {
      const conv = await api.startConversation();
      const typedMessages: Message[] = conv.messages.map(m => ({
        ...m,
        role: m.role as MessageRole
      }));
      setConversation({ ...conv, messages: typedMessages });
      if (typedMessages.length > 0) {
        setLastSequence(Math.max(...typedMessages.map(m => m.sequence)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
    }
  };

  const handleVisibilitySubmit = async () => {
    if (!createdGoalId) return;

    setSending(true);
    setError(null);

    try {
      await api.updateGoal(createdGoalId, { visibility: selectedVisibility });
      router.push(`/goals/${createdGoalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update visibility");
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversation || sending) return;

    const messageContent = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    // Optimistically add user message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageContent,
      sequence: lastSequence + 1,
      created_at: new Date().toISOString()
    };
    setConversation(prev => prev ? {
      ...prev,
      status: "waiting",
      messages: [...prev.messages, tempMessage]
    } : null);

    try {
      const msg = await api.sendChatMessage(conversation.id, messageContent);
      // Update with real message
      setConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "waiting",
          messages: prev.messages.map(m =>
            m.id === tempMessage.id ? msg as Message : m
          )
        };
      });
      setLastSequence(msg.sequence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove temp message on error
      setConversation(prev => prev ? {
        ...prev,
        status: "active",
        messages: prev.messages.filter(m => m.id !== tempMessage.id)
      } : null);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  // Show visibility selector modal
  if (showVisibilitySelector && createdGoalId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-800/90 backdrop-blur-lg rounded-2xl border border-white/10 p-8"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">✨</div>
            <h2 className="text-2xl font-bold text-white mb-2">Quest Created!</h2>
            <p className="text-gray-400">Who should see your quest?</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setSelectedVisibility("public")}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedVisibility === "public"
                  ? "border-emerald-500 bg-emerald-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedVisibility === "public" ? "bg-emerald-500/30" : "bg-white/10"
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">Public</div>
                  <div className="text-sm text-gray-400">Anyone can see and cheer you on</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedVisibility("private")}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedVisibility === "private"
                  ? "border-gray-500 bg-gray-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedVisibility === "private" ? "bg-gray-500/30" : "bg-white/10"
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">Private</div>
                  <div className="text-sm text-gray-400">Only you can see this quest</div>
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <motion.button
            onClick={handleVisibilitySubmit}
            disabled={sending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            {sending ? "Setting up..." : "Continue to Quest Map"}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>&larr;</span>
            <span>Dashboard</span>
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>✨</span>
            <span>Create Your Quest</span>
          </h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {conversation?.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-md"
                      : message.role === "system"
                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                      : "bg-white/10 text-white rounded-bl-md"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1 text-emerald-400 text-sm">
                      <span>✨</span>
                      <span>Quest Guide</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Waiting indicator */}
          {conversation?.status === "waiting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✨</span>
                  <span>Crafting your path</span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ...
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 pb-2">
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-4">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                conversation?.status === "waiting"
                  ? "Waiting for response..."
                  : "Type your message..."
              }
              disabled={!conversation || conversation.status === "waiting"}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || !conversation || conversation.status === "waiting"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
            >
              Send
            </motion.button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-3">
            Chat with your Quest Guide to create your personalized adventure
          </p>
        </div>
      </div>
    </div>
  );
}
