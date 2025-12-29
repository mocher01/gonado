"use client";

import { useCallback, useMemo, useState } from "react";
import { Stage, Container, Graphics, Text } from "@pixi/react";
import * as PIXI from "pixi.js";
import { motion, AnimatePresence } from "framer-motion";
import type { Node } from "@/types";
import { getWorldThemeColors } from "@/lib/utils";

interface QuestMapCanvasProps {
  nodes: Node[];
  worldTheme: string;
  onNodeClick: (node: Node) => void;
}

const NODE_RADIUS = 24;
const ACTIVE_GLOW_RADIUS = 40;

function NodeGraphic({
  node,
  onClick,
  themeColors,
}: {
  node: Node;
  onClick: () => void;
  themeColors: ReturnType<typeof getWorldThemeColors>;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getNodeColor = useCallback(() => {
    switch (node.status) {
      case "completed":
        return 0xffd700; // Gold
      case "active":
        return parseInt(themeColors.primary.replace("#", ""), 16);
      case "failed":
        return 0xef4444; // Red
      case "locked":
      default:
        return 0x6b7280; // Gray
    }
  }, [node.status, themeColors]);

  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();

      // Glow for active nodes
      if (node.status === "active") {
        g.beginFill(getNodeColor(), 0.2);
        g.drawCircle(0, 0, ACTIVE_GLOW_RADIUS);
        g.endFill();
      }

      // Main circle
      g.beginFill(getNodeColor());
      g.drawCircle(0, 0, NODE_RADIUS);
      g.endFill();

      // Border
      g.lineStyle(3, 0xffffff, node.status === "locked" ? 0.3 : 0.8);
      g.drawCircle(0, 0, NODE_RADIUS);

      // Inner highlight
      if (node.status !== "locked") {
        g.beginFill(0xffffff, 0.3);
        g.drawCircle(-6, -6, 8);
        g.endFill();
      }

      // Hover effect
      if (isHovered && node.status !== "locked") {
        g.lineStyle(2, 0xffffff, 0.5);
        g.drawCircle(0, 0, NODE_RADIUS + 8);
      }
    },
    [node.status, getNodeColor, isHovered]
  );

  return (
    <Container
      x={node.position_x}
      y={node.position_y}
      interactive={node.status !== "locked"}
      cursor={node.status !== "locked" ? "pointer" : "default"}
      pointerover={() => setIsHovered(true)}
      pointerout={() => setIsHovered(false)}
      pointerdown={onClick}
    >
      <Graphics draw={draw} />
      <Text
        text={node.order.toString()}
        anchor={0.5}
        style={
          new PIXI.TextStyle({
            fontSize: 16,
            fontWeight: "bold",
            fill: node.status === "locked" ? "#9ca3af" : "#ffffff",
          })
        }
      />
    </Container>
  );
}

function PathGraphic({
  nodes,
  themeColors,
}: {
  nodes: Node[];
  themeColors: ReturnType<typeof getWorldThemeColors>;
}) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();

      if (nodes.length < 2) return;

      const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);

      for (let i = 0; i < sortedNodes.length - 1; i++) {
        const current = sortedNodes[i];
        const next = sortedNodes[i + 1];

        // Determine path color based on completion
        const isCompleted = current.status === "completed";
        const pathColor = isCompleted
          ? parseInt(themeColors.primary.replace("#", ""), 16)
          : 0x4b5563;

        g.lineStyle(4, pathColor, isCompleted ? 0.8 : 0.4);

        // Draw curved path
        const midX = (current.position_x + next.position_x) / 2;
        const midY = (current.position_y + next.position_y) / 2;
        const offset = (i % 2 === 0 ? 1 : -1) * 30;

        g.moveTo(current.position_x, current.position_y);
        g.quadraticCurveTo(
          midX + offset,
          midY,
          next.position_x,
          next.position_y
        );
      }
    },
    [nodes, themeColors]
  );

  return <Graphics draw={draw} />;
}

function BackgroundGraphic({
  width,
  height,
  themeColors,
}: {
  width: number;
  height: number;
  themeColors: ReturnType<typeof getWorldThemeColors>;
}) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();

      // Gradient background
      const bgColor = parseInt(themeColors.bg.replace("#", ""), 16);
      g.beginFill(bgColor);
      g.drawRect(0, 0, width, height);
      g.endFill();

      // Stars/particles
      g.beginFill(0xffffff, 0.3);
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 1;
        g.drawCircle(x, y, size);
      }
      g.endFill();

      // Ground/horizon line
      g.beginFill(0x000000, 0.2);
      g.drawRect(0, height - 100, width, 100);
      g.endFill();
    },
    [width, height, themeColors]
  );

  return <Graphics draw={draw} />;
}

export function QuestMapCanvas({ nodes, worldTheme, onNodeClick }: QuestMapCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const themeColors = useMemo(() => getWorldThemeColors(worldTheme), [worldTheme]);

  // Calculate canvas dimensions based on nodes
  const dimensions = useMemo(() => {
    if (nodes.length === 0) return { width: 800, height: 600 };
    const maxX = Math.max(...nodes.map((n) => n.position_x)) + 100;
    const maxY = Math.max(...nodes.map((n) => n.position_y)) + 100;
    return {
      width: Math.max(800, maxX),
      height: Math.max(600, maxY),
    };
  }, [nodes]);

  const handleNodeClick = useCallback(
    (node: Node) => {
      if (node.status !== "locked") {
        setSelectedNode(node);
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  return (
    <div className="quest-map-container relative w-full h-full min-h-[600px] rounded-xl overflow-hidden">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        options={{
          backgroundColor: parseInt(themeColors.bg.replace("#", ""), 16),
          antialias: true,
        }}
      >
        <BackgroundGraphic
          width={dimensions.width}
          height={dimensions.height}
          themeColors={themeColors}
        />
        <PathGraphic nodes={nodes} themeColors={themeColors} />
        {nodes.map((node) => (
          <NodeGraphic
            key={node.id}
            node={node}
            onClick={() => handleNodeClick(node)}
            themeColors={themeColors}
          />
        ))}
      </Stage>

      {/* Node titles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {nodes.map((node) => (
          <div
            key={`label-${node.id}`}
            className="absolute text-center transform -translate-x-1/2"
            style={{
              left: node.position_x,
              top: node.position_y + NODE_RADIUS + 10,
            }}
          >
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm ${
                node.status === "locked"
                  ? "text-gray-500 bg-gray-800/50"
                  : node.status === "completed"
                  ? "text-yellow-300 bg-yellow-900/50"
                  : node.status === "active"
                  ? "text-primary-300 bg-primary-900/50"
                  : "text-red-300 bg-red-900/50"
              }`}
            >
              {node.title}
            </span>
          </div>
        ))}
      </div>

      {/* Selected node detail popup */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedNode.title}</h3>
                <p className="text-sm text-gray-400">{selectedNode.description}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
