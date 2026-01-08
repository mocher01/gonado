"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FilterBar - Category, Sort, and Needs Help Filters
 * ==================================================
 *
 * Provides filtering controls for the Discover page:
 * - Category dropdown (health, career, education, etc.)
 * - Sort dropdown (Newest, Trending, Almost Done)
 * - "Needs Help" toggle button
 * - Responsive: collapsible on mobile
 */

interface FilterBarProps {
  category: string;
  sort: 'newest' | 'trending' | 'almost_done';
  needsHelp: boolean;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: 'newest' | 'trending' | 'almost_done') => void;
  onNeedsHelpChange: (needsHelp: boolean) => void;
  onClearAll?: () => void;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "health", label: "Health", icon: "." },
  { value: "career", label: "Career", icon: "." },
  { value: "education", label: "Education", icon: "." },
  { value: "finance", label: "Finance", icon: "." },
  { value: "relationships", label: "Relationships", icon: "." },
  { value: "creativity", label: "Creativity", icon: "." },
  { value: "personal", label: "Personal", icon: "." },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "almost_done", label: "Almost Done" },
];

export function FilterBar({
  category,
  sort,
  needsHelp,
  onCategoryChange,
  onSortChange,
  onNeedsHelpChange,
  onClearAll,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const hasActiveFilters = category !== "" || needsHelp || sort !== "newest";

  return (
    <div className="mb-6">
      {/* Mobile toggle button */}
      <div className="md:hidden mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-white"
        >
          <span className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
                Active
              </span>
            )}
          </span>
          <ChevronIcon className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Filter controls - Desktop: always visible, Mobile: controlled by isExpanded */}
      <div className={`md:block ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          {/* Left side - Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Category Dropdown */}
            <div className="relative flex-1 md:flex-none md:w-48">
              <button
                onClick={() => {
                  setCategoryOpen(!categoryOpen);
                  setSortOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-white border border-white/10"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-lg">
                    {CATEGORIES.find(c => c.value === category)?.icon || "*"}
                  </span>
                  <span className="text-sm">
                    {CATEGORIES.find(c => c.value === category)?.label || "All Categories"}
                  </span>
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {categoryOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setCategoryOpen(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-20"
                    >
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            onCategoryChange(cat.value);
                            setCategoryOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors text-left ${
                            category === cat.value ? "bg-primary-500/10 text-primary-400" : "text-white"
                          }`}
                        >
                          <span className="text-lg">{cat.icon || "*"}</span>
                          <span className="text-sm">{cat.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-1 md:flex-none md:w-44">
              <button
                onClick={() => {
                  setSortOpen(!sortOpen);
                  setCategoryOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-white border border-white/10"
              >
                <span className="flex items-center gap-2 truncate">
                  <SortIcon className="w-4 h-4" />
                  <span className="text-sm">
                    {SORT_OPTIONS.find(s => s.value === sort)?.label || "Newest"}
                  </span>
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSortOpen(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-20"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onSortChange(option.value as typeof sort);
                            setSortOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors text-left ${
                            sort === option.value ? "bg-primary-500/10 text-primary-400" : "text-white"
                          }`}
                        >
                          <span className="text-sm">{option.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Needs Help Toggle */}
            <button
              onClick={() => onNeedsHelpChange(!needsHelp)}
              className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap border ${
                needsHelp
                  ? "bg-accent-500/20 text-accent-400 border-accent-500/50"
                  : "bg-white/5 hover:bg-white/10 text-white border-white/10"
              }`}
            >
              <HelpIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Needs Help</span>
            </button>
          </div>

          {/* Right side - Clear button */}
          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-medium flex items-center gap-2 justify-center"
            >
              <XIcon className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Icon components
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
