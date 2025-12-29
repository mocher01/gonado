"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CATEGORIES = [
  { value: "health", label: "Health & Fitness", icon: "💪" },
  { value: "career", label: "Career & Work", icon: "💼" },
  { value: "education", label: "Education & Learning", icon: "📚" },
  { value: "finance", label: "Finance & Money", icon: "💰" },
  { value: "relationships", label: "Relationships", icon: "❤️" },
  { value: "creativity", label: "Creativity & Arts", icon: "🎨" },
  { value: "personal", label: "Personal Growth", icon: "🌱" },
  { value: "other", label: "Other", icon: "✨" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Anyone can see this goal" },
  { value: "private", label: "Private", description: "Only you can see this goal" },
  { value: "friends", label: "Friends", description: "Only friends can see this goal" },
];

export default function NewGoalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    visibility: "public" as "public" | "private" | "friends",
    target_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Convert date to ISO datetime format if provided
      let targetDate: string | undefined;
      if (formData.target_date) {
        targetDate = new Date(formData.target_date).toISOString();
      }

      const goal = await api.createGoal({
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category || undefined,
        visibility: formData.visibility,
        target_date: targetDate,
      });
      router.push(`/goals/${goal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white transition-colors mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">Create New Goal</h1>
        <p className="text-gray-400 mt-1">
          Define your goal and let AI help you create a plan
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Goal Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Run a marathon, Learn to play guitar"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your goal in more detail. What does success look like?"
                rows={4}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, category: cat.value })
                    }
                    className={`p-3 rounded-lg border transition-all text-left ${
                      formData.category === cat.value
                        ? "border-primary-500 bg-primary-500/20 text-white"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xl mb-1">{cat.icon}</div>
                    <div className="text-xs">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.visibility === opt.value
                        ? "border-primary-500 bg-primary-500/20"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={formData.visibility === opt.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visibility: e.target.value as typeof formData.visibility,
                        })
                      }
                      className="sr-only"
                    />
                    <div>
                      <div className="text-white font-medium">{opt.label}</div>
                      <div className="text-gray-400 text-sm">
                        {opt.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Date (optional)
              </label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) =>
                  setFormData({ ...formData, target_date: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !formData.title}>
                {submitting ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
