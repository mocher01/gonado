"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

interface GatewayNodeData {
  type: "fork" | "join";
  themeColors: {
    pathColor: string;
    pathGlow: string;
  };
}

interface GatewayNodeProps {
  data: GatewayNodeData;
}

function GatewayNodeComponent({ data }: GatewayNodeProps) {
  const { type, themeColors } = data;
  const isFork = type === "fork";

  return (
    <div className="relative">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-left-2"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative flex items-center justify-center"
      >
        {/* Diamond shape with glow */}
        <motion.div
          className="w-14 h-14 flex items-center justify-center rotate-45 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${themeColors.pathColor}60, ${themeColors.pathColor}30)`,
            border: `2px solid ${themeColors.pathColor}`,
            boxShadow: `0 0 25px ${themeColors.pathGlow}, inset 0 0 15px ${themeColors.pathColor}30`,
          }}
          animate={{
            boxShadow: [
              `0 0 20px ${themeColors.pathGlow}, inset 0 0 15px ${themeColors.pathColor}30`,
              `0 0 35px ${themeColors.pathGlow}, inset 0 0 20px ${themeColors.pathColor}40`,
              `0 0 20px ${themeColors.pathGlow}, inset 0 0 15px ${themeColors.pathColor}30`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="-rotate-45 text-xl">
            {isFork ? "⚡" : "🔗"}
          </span>
        </motion.div>

        {/* Animated outer ring */}
        <motion.div
          className="absolute w-14 h-14 rotate-45 rounded-lg pointer-events-none"
          style={{ border: `2px solid ${themeColors.pathColor}` }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Output handles for fork (multiple) */}
      {isFork ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="top"
            className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-right-2"
            style={{ top: "20%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="middle"
            className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-right-2"
            style={{ top: "50%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="bottom"
            className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-right-2"
            style={{ top: "80%" }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-right-2"
        />
      )}
    </div>
  );
}

export const GatewayNode = memo(GatewayNodeComponent);
