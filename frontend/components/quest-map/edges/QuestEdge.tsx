"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
} from "@xyflow/react";
import { motion } from "framer-motion";

interface QuestEdgeData {
  isCompleted: boolean;
  isCriticalPath: boolean;
  themeColors: {
    pathColor: string;
    pathGlow: string;
  };
}

interface QuestEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: QuestEdgeData;
  style?: React.CSSProperties;
}

function QuestEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: QuestEdgeProps) {
  const { isCompleted = false, isCriticalPath = false, themeColors } = data || {};

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  const pathColor = isCompleted
    ? themeColors?.pathColor || "#22c55e"
    : "rgba(255,255,255,0.15)";

  const glowColor = themeColors?.pathGlow || "rgba(34, 197, 94, 0.5)";

  return (
    <>
      {/* Glow effect for completed/critical paths */}
      {(isCompleted || isCriticalPath) && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={12}
          strokeLinecap="round"
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Main path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: pathColor,
          strokeWidth: isCompleted ? 3 : 2,
          strokeDasharray: isCompleted ? "none" : "8 8",
        }}
      />

      {/* Animated flow particles for completed paths */}
      {isCompleted && (
        <EdgeLabelRenderer>
          <motion.div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%)`,
              pointerEvents: "none",
            }}
            animate={{
              offsetDistance: ["0%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: themeColors?.pathColor || "#22c55e",
                boxShadow: `0 0 8px ${glowColor}`,
              }}
            />
          </motion.div>
        </EdgeLabelRenderer>
      )}

      {/* Critical path indicator */}
      {isCriticalPath && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            <div className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-medium">
              Critical
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const QuestEdge = memo(QuestEdgeComponent);
