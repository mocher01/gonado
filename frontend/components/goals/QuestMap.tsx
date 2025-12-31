"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Node } from "@/types";

interface QuestMapProps {
  nodes: Node[];
  worldTheme: string;
  goalTitle: string;
  onNodeClick?: (node: Node) => void;
  onCompleteNode?: (nodeId: string) => void;
}

const THEME_CONFIGS: Record<string, {
  bg: string;
  bgGradient: string;
  pathColor: string;
  pathGlow: string;
  nodeActive: string;
  nodeCompleted: string;
  nodeLocked: string;
  icon: string;
  particles: string[];
}> = {
  mountain: {
    bg: "#1a1a2e",
    bgGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    pathColor: "#f59e0b",
    pathGlow: "rgba(245, 158, 11, 0.5)",
    nodeActive: "linear-gradient(135deg, #f59e0b, #ea580c)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #374151, #1f2937)",
    icon: "🏔️",
    particles: ["❄️", "🍂", "🌬️"]
  },
  ocean: {
    bg: "#0c1929",
    bgGradient: "linear-gradient(135deg, #0c1929 0%, #0d3b66 50%, #1a5f7a 100%)",
    pathColor: "#06b6d4",
    pathGlow: "rgba(6, 182, 212, 0.5)",
    nodeActive: "linear-gradient(135deg, #06b6d4, #0891b2)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #1e3a5f, #0c1929)",
    icon: "🌊",
    particles: ["🐠", "🫧", "✨"]
  },
  forest: {
    bg: "#0d1f0d",
    bgGradient: "linear-gradient(135deg, #0d1f0d 0%, #1a3a1a 50%, #2d4a2d 100%)",
    pathColor: "#22c55e",
    pathGlow: "rgba(34, 197, 94, 0.5)",
    nodeActive: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeCompleted: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    nodeLocked: "linear-gradient(135deg, #1f2d1f, #0d1f0d)",
    icon: "🌲",
    particles: ["🍃", "🦋", "✨"]
  },
  desert: {
    bg: "#2d1f0d",
    bgGradient: "linear-gradient(135deg, #2d1f0d 0%, #4a3520 50%, #6b4423 100%)",
    pathColor: "#fbbf24",
    pathGlow: "rgba(251, 191, 36, 0.5)",
    nodeActive: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #3d2d1a, #2d1f0d)",
    icon: "🏜️",
    particles: ["🌵", "☀️", "🦎"]
  },
  space: {
    bg: "#0a0a1a",
    bgGradient: "linear-gradient(135deg, #0a0a1a 0%, #0d1a2a 50%, #0a2a3a 100%)",
    pathColor: "#06b6d4",
    pathGlow: "rgba(6, 182, 212, 0.5)",
    nodeActive: "linear-gradient(135deg, #06b6d4, #0891b2)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #1f2937, #0a0a1a)",
    icon: "🚀",
    particles: ["⭐", "🌟", "💫"]
  },
  city: {
    bg: "#1a1a1a",
    bgGradient: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)",
    pathColor: "#3b82f6",
    pathGlow: "rgba(59, 130, 246, 0.5)",
    nodeActive: "linear-gradient(135deg, #3b82f6, #2563eb)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #2d2d2d, #1a1a1a)",
    icon: "🏙️",
    particles: ["🚕", "💡", "🏢"]
  },
};

const NODE_WIDTH = 280;
const NODE_GAP = 120;

export function QuestMap({ nodes, worldTheme, goalTitle, onCompleteNode }: QuestMapProps) {
  const theme = THEME_CONFIGS[worldTheme] || THEME_CONFIGS.mountain;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sort nodes by order
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const totalWidth = nodes.length * (NODE_WIDTH + NODE_GAP) + 300;
  const completedCount = nodes.filter(n => n.status === "completed").length;
  const progress = nodes.length > 0 ? (completedCount / nodes.length) * 100 : 0;

  // Center on active node on mount
  useEffect(() => {
    if (containerRef.current) {
      const activeIndex = sortedNodes.findIndex(n => n.status === "active");
      const targetIndex = activeIndex >= 0 ? activeIndex : 0;
      const containerWidth = containerRef.current.clientWidth;
      const nodeX = 150 + targetIndex * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2;
      setPan({ x: containerWidth / 2 - nodeX, y: 0 });
    }
  }, [nodes.length]);

  // Mouse wheel for zoom and pan
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.min(2, Math.max(0.5, z + delta)));
    } else {
      // Pan with wheel
      setPan(p => ({
        x: p.x - e.deltaX - (e.deltaY * 2),
        y: p.y
      }));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(2, z + 0.2));
  const zoomOut = () => setZoom(z => Math.max(0.5, z - 0.2));
  const resetView = () => {
    setZoom(1);
    if (containerRef.current) {
      const activeIndex = sortedNodes.findIndex(n => n.status === "active");
      const targetIndex = activeIndex >= 0 ? activeIndex : 0;
      const containerWidth = containerRef.current.clientWidth;
      const nodeX = 150 + targetIndex * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2;
      setPan({ x: containerWidth / 2 - nodeX, y: 0 });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: theme.bgGradient, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            {theme.particles[i % theme.particles.length]}
          </motion.div>
        ))}
      </div>

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{theme.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{goalTitle}</h2>
              <p className="text-gray-400">{completedCount} of {nodes.length} milestones</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48 h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: theme.nodeActive }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-24 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="w-10 h-10 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white text-xl hover:bg-black/70 transition-all"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white text-sm hover:bg-black/70 transition-all"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white text-xl hover:bg-black/70 transition-all"
        >
          −
        </button>
      </div>

      {/* Pannable/Zoomable content */}
      <div
        ref={contentRef}
        className="absolute inset-0 flex items-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* SVG Connections */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: `${totalWidth}px`, height: '100%' }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {sortedNodes.map((node, index) => {
            if (index === sortedNodes.length - 1) return null;

            const startX = 150 + index * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH;
            const endX = 150 + (index + 1) * (NODE_WIDTH + NODE_GAP);
            const y = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
            const midX = (startX + endX) / 2;
            const curve = 40;

            const isCompleted = node.status === "completed";

            return (
              <g key={`path-${index}`}>
                {isCompleted && (
                  <path
                    d={`M ${startX} ${y} C ${startX + 30} ${y - curve}, ${endX - 30} ${y - curve}, ${endX} ${y}`}
                    fill="none"
                    stroke={theme.pathGlow}
                    strokeWidth="16"
                    filter="url(#glow)"
                  />
                )}
                <path
                  d={`M ${startX} ${y} C ${startX + 30} ${y - curve}, ${endX - 30} ${y - curve}, ${endX} ${y}`}
                  fill="none"
                  stroke={isCompleted ? theme.pathColor : "rgba(255,255,255,0.15)"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={isCompleted ? "none" : "8 8"}
                />
              </g>
            );
          })}
        </svg>

        {/* Start marker */}
        <div
          className="absolute flex flex-col items-center pointer-events-none"
          style={{ left: "50px", top: "50%", transform: "translateY(-50%)" }}
        >
          <div className="text-5xl mb-2">🚩</div>
          <div className="text-white font-bold text-lg">START</div>
        </div>

        {/* Goal marker */}
        <div
          className="absolute flex flex-col items-center pointer-events-none"
          style={{ left: `${150 + sortedNodes.length * (NODE_WIDTH + NODE_GAP) + 30}px`, top: "50%", transform: "translateY(-50%)" }}
        >
          <div className="text-5xl mb-2">🏆</div>
          <div className="text-white font-bold text-lg">GOAL</div>
        </div>

        {/* Nodes */}
        {sortedNodes.map((node, index) => {
          const isCompleted = node.status === "completed";
          const isActive = node.status === "active";
          const isLocked = node.status === "locked";
          const xPos = 150 + index * (NODE_WIDTH + NODE_GAP);

          return (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                left: `${xPos}px`,
                top: "50%",
                transform: "translateY(-50%)",
                width: `${NODE_WIDTH}px`,
                pointerEvents: 'auto',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={`relative p-5 rounded-2xl border-2 backdrop-blur-sm cursor-pointer ${
                  isCompleted
                    ? "border-green-500/50 shadow-lg shadow-green-500/20"
                    : isActive
                    ? "border-amber-500/50 shadow-lg shadow-amber-500/20"
                    : "border-white/10 opacity-60"
                }`}
                style={{
                  background: isCompleted
                    ? "rgba(34, 197, 94, 0.15)"
                    : isActive
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(255, 255, 255, 0.05)",
                }}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node);
                }}
              >
                {/* Node number */}
                <div
                  className="absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                  style={{
                    background: isCompleted
                      ? theme.nodeCompleted
                      : isActive
                      ? theme.nodeActive
                      : theme.nodeLocked,
                  }}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>

                {/* Active pulse */}
                {isActive && (
                  <motion.div
                    className="absolute -inset-1 rounded-2xl border-2 border-amber-500/50"
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <h3 className={`font-bold text-lg mb-2 ${
                  isCompleted ? "text-green-400" : isActive ? "text-amber-400" : "text-gray-500"
                }`}>
                  {node.title}
                </h3>

                {node.description && (
                  <p className={`text-sm line-clamp-2 ${
                    isCompleted ? "text-green-300/70" : isActive ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {node.description}
                  </p>
                )}

                {isActive && onCompleteNode && (
                  <motion.button
                    className="mt-4 w-full py-2 rounded-xl text-white font-semibold text-sm"
                    style={{ background: theme.nodeActive }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteNode(node.id);
                    }}
                  >
                    Complete Milestone
                  </motion.button>
                )}

                {isLocked && (
                  <div className="mt-3 flex items-center gap-2 text-gray-500 text-sm">
                    <span>🔒</span>
                    <span>Complete previous first</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-gray-400 text-sm bg-black/50 px-6 py-3 rounded-full backdrop-blur-sm border border-white/10 pointer-events-none">
        <span>🖱️ Drag to pan</span>
        <span className="text-white/30">|</span>
        <span>⚙️ Scroll to move</span>
        <span className="text-white/30">|</span>
        <span>🔍 Ctrl+Scroll to zoom</span>
      </div>

      {/* Node detail modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/20 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                      background: selectedNode.status === "completed"
                        ? theme.nodeCompleted
                        : selectedNode.status === "active"
                        ? theme.nodeActive
                        : theme.nodeLocked,
                    }}
                  >
                    {selectedNode.status === "completed" ? "✓" : selectedNode.order}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedNode.title}</h3>
                    <span className={`text-sm ${
                      selectedNode.status === "completed" ? "text-green-400" :
                      selectedNode.status === "active" ? "text-amber-400" : "text-gray-500"
                    }`}>
                      {selectedNode.status.charAt(0).toUpperCase() + selectedNode.status.slice(1)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedNode.description && (
                <p className="text-gray-300 mb-6 whitespace-pre-wrap">{selectedNode.description}</p>
              )}

              {selectedNode.status === "active" && onCompleteNode && (
                <button
                  className="w-full py-3 rounded-xl text-white font-semibold"
                  style={{ background: theme.nodeActive }}
                  onClick={() => {
                    onCompleteNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                >
                  Complete This Milestone
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
