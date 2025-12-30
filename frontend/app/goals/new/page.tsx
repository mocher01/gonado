"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
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

  // Start or resume conversation
  useEffect(() => {
    if (user && !conversation) {
      startOrResumeConversation();
    }
  }, [user]);

  // Poll for new messages when waiting
  useEffect(() => {
    if (!conversation || conversation.status !== "waiting") return;

    const pollInterval = setInterval(async () => {
      try {
        const newMessages = await api.getChatMessages(conversation.id, lastSequence);
        if (newMessages.length > 0) {
          setConversation(prev => {
            if (!prev) return prev;
            const existingIds = new Set(prev.messages.map(m => m.id));
            const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
            return {
              ...prev,
              status: "active",
              messages: [...prev.messages, ...uniqueNew]
            };
          });
          setLastSequence(Math.max(...newMessages.map(m => m.sequence)));
        }

        // Check if goal was created
        const current = await api.getCurrentConversation();
        if (current?.status === "completed" && current.goal_id) {
          router.push(`/goals/${current.goal_id}`);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [conversation?.id, conversation?.status, lastSequence, router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const startOrResumeConversation = async () => {
    try {
      const conv = await api.startConversation();
      setConversation(conv as Conversation);
      if (conv.messages.length > 0) {
        setLastSequence(Math.max(...conv.messages.map((m: Message) => m.sequence)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
                      ? "bg-purple-600 text-white rounded-br-md"
                      : message.role === "system"
                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                      : "bg-white/10 text-white rounded-bl-md"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1 text-purple-400 text-sm">
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
                <div className="flex items-center gap-2 text-purple-400">
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
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || !conversation || conversation.status === "waiting"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 transition-colors"
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
