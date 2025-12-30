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
        className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        {/* Diamond shape */}
        <div
          className="w-12 h-12 flex items-center justify-center rotate-45 rounded-md border-2"
          style={{
            background: `linear-gradient(135deg, ${themeColors.pathColor}40, ${themeColors.pathColor}20)`,
            borderColor: themeColors.pathColor,
            boxShadow: `0 0 20px ${themeColors.pathGlow}`,
          }}
        >
          <span className="-rotate-45 text-lg">
            {isFork ? "⚡" : "⊕"}
          </span>
        </div>

        {/* Label */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap"
          style={{ color: themeColors.pathColor }}
        >
          {isFork ? "PARALLEL" : "SYNC"}
        </div>

        {/* Animated ring */}
        <motion.div
          className="absolute inset-0 rotate-45 rounded-md border-2"
          style={{ borderColor: themeColors.pathColor }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Output handles for fork (multiple) */}
      {isFork ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="top"
            className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
            style={{ top: "20%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="middle"
            className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
            style={{ top: "50%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="bottom"
            className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
            style={{ top: "80%" }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
        />
      )}
    </div>
  );
}

export const GatewayNode = memo(GatewayNodeComponent);
