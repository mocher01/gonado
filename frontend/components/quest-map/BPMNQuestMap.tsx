"use client";

/**
 * BPMN-Inspired Quest Map Component
 * ==================================
 *
 * LAYOUT RULES:
 * 1. Horizontal flow: left to right
 * 2. First task node IS the start - NO gateway before it
 * 3. Last node connects to "Goal Complete!" milestone
 * 4. Gateways (fork/join) ONLY when there are parallel tasks
 *
 * LAYOUT ALGORITHM:
 * - Track lastNodeId to properly connect sequential nodes
 * - Parallel groups: fork gateway → parallel nodes (vertical stack) → join gateway
 * - Sequential nodes: simple left-to-right connection
 *
 * NODE TYPES:
 * - task: Regular step (TaskNode component)
 * - milestone: Major checkpoint (MilestoneNode component)
 * - gateway: Fork/Join for parallel paths (GatewayNode component) - auto-generated
 *
 * EDGE CONNECTIONS:
 * - Each node connects to the next via lastNodeId tracking
 * - Gateways connect to all parallel nodes (fork) or receive from all (join)
 * - isCompleted determines edge glow/color
 *
 * UI CHECKLIST (for future generation):
 * =====================================
 * ✓ onComplete callback MUST be passed to ALL TaskNodes with status="active"
 * ✓ First node receives onComplete just like any other node
 * ✓ Node width should be fixed (not max-width) to prevent truncation
 * ✓ Description text must be fully visible without scrolling
 * ✓ Button "Mark as Complete" must be visible on active nodes
 */

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Node } from "@/types";
import { TaskNode } from "./nodes/TaskNode";
import { GatewayNode } from "./nodes/GatewayNode";
import { MilestoneNode } from "./nodes/MilestoneNode";
import { QuestEdge } from "./edges/QuestEdge";

// Social data summary for a node
interface NodeSocialSummary {
  reactions_total: number;
  comments_count: number;
  resources_count: number;
}

interface BPMNQuestMapProps {
  nodes: Node[];
  worldTheme: string;
  goalTitle: string;
  isOwner?: boolean;
  onNodeClick?: (node: Node) => void;
  onNodeSocialClick?: (node: Node, screenPosition: { x: number; y: number }) => void;
  onCompleteNode?: (nodeId: string) => void;
  onChecklistToggle?: (nodeId: string, itemId: string, completed: boolean) => void;
  onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
  onNodeEdit?: (nodeId: string) => void;
  nodeSocialData?: Record<string, NodeSocialSummary>;
}

const THEME_CONFIGS: Record<
  string,
  {
    bg: string;
    bgGradient: string;
    pathColor: string;
    pathGlow: string;
    nodeActive: string;
    nodeCompleted: string;
    nodeLocked: string;
    icon: string;
    particles: string[];
  }
> = {
  mountain: {
    bg: "#1a1a2e",
    bgGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    pathColor: "#f59e0b",
    pathGlow: "rgba(245, 158, 11, 0.5)",
    nodeActive: "linear-gradient(135deg, #f59e0b, #ea580c)",
    nodeCompleted: "linear-gradient(135deg, #22c55e, #16a34a)",
    nodeLocked: "linear-gradient(135deg, #374151, #1f2937)",
    icon: "🏔️",
    particles: ["❄️", "🍂", "🌬️"],
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
    particles: ["🐠", "🫧", "✨"],
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
    particles: ["🍃", "🦋", "✨"],
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
    particles: ["🌵", "☀️", "🦎"],
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
    particles: ["⭐", "🌟", "💫"],
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
    particles: ["🚕", "💡", "🏢"],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  task: TaskNode,
  gateway: GatewayNode,
  milestone: MilestoneNode,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: Record<string, any> = {
  quest: QuestEdge,
};

// Inner component that uses React Flow
function BPMNQuestMapInner({
  nodes: inputNodes,
  worldTheme,
  goalTitle,
  isOwner = false,
  onCompleteNode,
  onChecklistToggle,
  onNodePositionChange,
  onNodeEdit,
  onNodeSocialClick,
  nodeSocialData,
  theme,
}: BPMNQuestMapProps & { theme: typeof THEME_CONFIGS.mountain }) {
  // Import React Flow hooks dynamically
  const [ReactFlowModule, setReactFlowModule] = useState<{
    ReactFlow: typeof import("@xyflow/react").ReactFlow;
    Background: typeof import("@xyflow/react").Background;
    Controls: typeof import("@xyflow/react").Controls;
    MiniMap: typeof import("@xyflow/react").MiniMap;
    Panel: typeof import("@xyflow/react").Panel;
    useNodesState: typeof import("@xyflow/react").useNodesState;
    useEdgesState: typeof import("@xyflow/react").useEdgesState;
    MarkerType: typeof import("@xyflow/react").MarkerType;
  } | null>(null);

  useEffect(() => {
    import("@xyflow/react").then((mod) => {
      setReactFlowModule({
        ReactFlow: mod.ReactFlow,
        Background: mod.Background,
        Controls: mod.Controls,
        MiniMap: mod.MiniMap,
        Panel: mod.Panel,
        useNodesState: mod.useNodesState,
        useEdgesState: mod.useEdgesState,
        MarkerType: mod.MarkerType,
      });
    });
  }, []);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Sort nodes by order
  const sortedNodes = useMemo(
    () => [...inputNodes].sort((a, b) => a.order - b.order),
    [inputNodes]
  );

  // Build flow data for React Flow
  // IMPORTANT: No start gateway - first node IS the start
  // lastNodeId tracks the previous node for edge connections
  const { flowNodes, flowEdges } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges: any[] = [];

    // Step 1: Detect parallel groups (2+ consecutive nodes with can_parallel=true)
    // Only these groups get fork/join gateways
    const parallelGroups: Node[][] = [];
    let currentGroup: Node[] = [];

    sortedNodes.forEach((node) => {
      if (node.can_parallel) {
        currentGroup.push(node);
      } else {
        if (currentGroup.length > 1) {
          parallelGroups.push([...currentGroup]);
        }
        currentGroup = [];
      }
    });
    if (currentGroup.length > 1) {
      parallelGroups.push(currentGroup);
    }

    // Create a map of parallel group starts
    const parallelGroupStarts = new Map<string, Node[]>();
    parallelGroups.forEach((group) => {
      parallelGroupStarts.set(group[0].id, group);
    });

    // Step 2: Layout configuration (sized for new UX-friendly nodes)
    const NODE_WIDTH = 420;    // TaskNode is 400px + margin
    const NODE_HEIGHT = 350;   // Nodes with checklists can be tall
    const HORIZONTAL_GAP = 180;
    const VERTICAL_GAP = 60;   // Gap between parallel nodes

    let xPosition = 100;  // Start position (no gateway before first node)
    const processedIds = new Set<string>();
    let lastNodeId = null as string | null;  // Track last node for edge connections

    // Step 3: Build nodes and edges
    // - Sequential nodes: connect directly via lastNodeId
    // - Parallel groups: fork → parallel nodes (stacked vertically) → join
    sortedNodes.forEach((node, index) => {
      if (processedIds.has(node.id)) return;

      const parallelGroup = parallelGroupStarts.get(node.id);

      if (parallelGroup && parallelGroup.length > 1) {
        // PARALLEL PATH: Add fork gateway → parallel nodes → join gateway
        const forkId = `fork-${node.id}`;
        nodes.push({
          id: forkId,
          type: "gateway",
          position: { x: xPosition, y: 250 },
          data: {
            type: "fork",
            themeColors: {
              pathColor: theme.pathColor,
              pathGlow: theme.pathGlow,
            },
          },
        });

        // Connect previous node to fork
        if (lastNodeId) {
          const prevNode = sortedNodes.find((n) => n.id === lastNodeId);
          edges.push({
            id: `edge-${lastNodeId}-${forkId}`,
            source: lastNodeId,
            target: forkId,
            type: "quest",
            data: {
              isCompleted: prevNode?.status === "completed",
              isCriticalPath: false,
              themeColors: {
                pathColor: theme.pathColor,
                pathGlow: theme.pathGlow,
              },
            },
          });
        }

        xPosition += 80;

        // Add parallel nodes vertically
        const groupHeight =
          parallelGroup.length * (NODE_HEIGHT + VERTICAL_GAP);
        const startY = 250 - groupHeight / 2 + NODE_HEIGHT / 2;

        parallelGroup.forEach((parallelNode, pIndex) => {
          const yPos = startY + pIndex * (NODE_HEIGHT + VERTICAL_GAP);

          nodes.push({
            id: parallelNode.id,
            type:
              parallelNode.node_type === "milestone" ? "milestone" : "task",
            position: { x: xPosition, y: yPos },
            data: {
              nodeId: parallelNode.id,
              title: parallelNode.title,
              description: parallelNode.description,
              status: parallelNode.status,
              order: parallelNode.order,
              can_parallel: parallelNode.can_parallel,
              extra_data: parallelNode.extra_data,
              onComplete: onCompleteNode
                ? () => onCompleteNode(parallelNode.id)
                : undefined,
              onChecklistToggle: onChecklistToggle
                ? (itemId: string, completed: boolean) => onChecklistToggle(parallelNode.id, itemId, completed)
                : undefined,
              onEdit: onNodeEdit
                ? () => onNodeEdit(parallelNode.id)
                : undefined,
              onSocialClick: onNodeSocialClick
                ? (screenPosition: { x: number; y: number }) => onNodeSocialClick(parallelNode, screenPosition)
                : undefined,
              socialData: nodeSocialData?.[parallelNode.id],
              themeColors: {
                nodeActive: theme.nodeActive,
                nodeCompleted: theme.nodeCompleted,
                nodeLocked: theme.nodeLocked,
                pathColor: theme.pathColor,
              },
            },
          });

          // Connect fork to parallel node
          edges.push({
            id: `edge-${forkId}-${parallelNode.id}`,
            source: forkId,
            target: parallelNode.id,
            sourceHandle: ["top", "middle", "bottom"][pIndex % 3],
            type: "quest",
            data: {
              isCompleted: false,
              isCriticalPath: false,
              themeColors: {
                pathColor: theme.pathColor,
                pathGlow: theme.pathGlow,
              },
            },
          });

          processedIds.add(parallelNode.id);
        });

        xPosition += NODE_WIDTH + HORIZONTAL_GAP;

        // Add join gateway
        const joinId = `join-${node.id}`;
        nodes.push({
          id: joinId,
          type: "gateway",
          position: { x: xPosition, y: 250 },
          data: {
            type: "join",
            themeColors: {
              pathColor: theme.pathColor,
              pathGlow: theme.pathGlow,
            },
          },
        });

        // Connect parallel nodes to join
        parallelGroup.forEach((parallelNode) => {
          edges.push({
            id: `edge-${parallelNode.id}-${joinId}`,
            source: parallelNode.id,
            target: joinId,
            type: "quest",
            data: {
              isCompleted: parallelNode.status === "completed",
              isCriticalPath: false,
              themeColors: {
                pathColor: theme.pathColor,
                pathGlow: theme.pathGlow,
              },
            },
          });
        });

        lastNodeId = joinId;
        xPosition += 80;
      } else {
        // SEQUENTIAL PATH: Simple node → node connection
        // Most common case - no gateways needed
        const yPos = 250;

        nodes.push({
          id: node.id,
          type: node.node_type === "milestone" ? "milestone" : "task",
          position: { x: xPosition, y: yPos },
          data: {
            nodeId: node.id,
            title: node.title,
            description: node.description,
            status: node.status,
            order: node.order,
            can_parallel: node.can_parallel,
            extra_data: node.extra_data,
            onComplete: onCompleteNode
              ? () => onCompleteNode(node.id)
              : undefined,
            onChecklistToggle: onChecklistToggle
              ? (itemId: string, completed: boolean) => onChecklistToggle(node.id, itemId, completed)
              : undefined,
            onEdit: onNodeEdit
              ? () => onNodeEdit(node.id)
              : undefined,
            onSocialClick: onNodeSocialClick
              ? (screenPosition: { x: number; y: number }) => onNodeSocialClick(node, screenPosition)
              : undefined,
            socialData: nodeSocialData?.[node.id],
            themeColors: {
              nodeActive: theme.nodeActive,
              nodeCompleted: theme.nodeCompleted,
              nodeLocked: theme.nodeLocked,
              pathColor: theme.pathColor,
            },
          },
        });

        // Connect to previous node
        if (lastNodeId) {
          const prevNode = sortedNodes.find((n) => n.id === lastNodeId);
          const isGateway = lastNodeId.startsWith("join-") || lastNodeId.startsWith("fork-");
          edges.push({
            id: `edge-${lastNodeId}-${node.id}`,
            source: lastNodeId,
            target: node.id,
            type: "quest",
            data: {
              isCompleted: isGateway || prevNode?.status === "completed",
              isCriticalPath: false,
              themeColors: {
                pathColor: theme.pathColor,
                pathGlow: theme.pathGlow,
              },
            },
          });
        }

        lastNodeId = node.id;
        xPosition += NODE_WIDTH + HORIZONTAL_GAP;
        processedIds.add(node.id);
      }
    });

    // Add end node
    nodes.push({
      id: "end",
      type: "milestone",
      position: { x: xPosition, y: 250 },
      data: {
        title: "Goal Complete!",
        status:
          sortedNodes.every((n) => n.status === "completed")
            ? "completed"
            : "locked",
        themeColors: {
          pathColor: theme.pathColor,
          nodeCompleted: theme.nodeCompleted,
        },
      },
    });

    // Connect last node to end
    if (lastNodeId) {
      const lastRealNode = sortedNodes.find((n) => n.id === lastNodeId);
      const isGateway = lastNodeId.startsWith("join-") || lastNodeId.startsWith("fork-");
      edges.push({
        id: `edge-${lastNodeId}-end`,
        source: lastNodeId,
        target: "end",
        type: "quest",
        data: {
          isCompleted: isGateway || lastRealNode?.status === "completed",
          isCriticalPath: true,
          themeColors: {
            pathColor: theme.pathColor,
            pathGlow: theme.pathGlow,
          },
        },
      });
    }

    return { flowNodes: nodes, flowEdges: edges };
  }, [sortedNodes, theme, onCompleteNode, onChecklistToggle, onNodeEdit, onNodeSocialClick, nodeSocialData]);

  // State for draggable nodes
  const [draggableNodes, setDraggableNodes] = useState(flowNodes);
  const [draggableEdges, setDraggableEdges] = useState(flowEdges);

  // State for save indicator
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Debounce ref for position saves
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Sync when flow data changes
  useEffect(() => {
    setDraggableNodes(flowNodes);
    setDraggableEdges(flowEdges);
  }, [flowNodes, flowEdges]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle node position changes (drag) using React Flow's applyNodeChanges
  const onNodesChange = useCallback((changes: any[]) => {
    setDraggableNodes((nds) => {
      // Apply changes manually for position updates
      let newNodes = [...nds];
      changes.forEach((change) => {
        if (change.type === "position") {
          const nodeIndex = newNodes.findIndex((n) => n.id === change.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = {
              ...newNodes[nodeIndex],
              position: change.position ?? newNodes[nodeIndex].position,
              dragging: change.dragging,
            };
          }
        }
      });
      return newNodes;
    });
  }, []);

  // Persist position on drag end with debouncing
  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      // Only persist task nodes (not gateways or virtual nodes)
      if (
        onNodePositionChange &&
        isOwner &&
        !node.id.startsWith("fork-") &&
        !node.id.startsWith("join-") &&
        node.id !== "end" &&
        node.id !== "start"
      ) {
        // Add to pending positions
        pendingPositionsRef.current.set(node.id, { x: node.position.x, y: node.position.y });

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer (500ms)
        debounceTimerRef.current = setTimeout(async () => {
          const pending = new Map(pendingPositionsRef.current);
          pendingPositionsRef.current.clear();

          if (pending.size > 0) {
            setIsSaving(true);
            setSaveSuccess(false);

            try {
              // Save all pending positions
              const savePromises = Array.from(pending.entries()).map(([nodeId, pos]) =>
                onNodePositionChange(nodeId, pos.x, pos.y)
              );
              await Promise.all(savePromises);
              setSaveSuccess(true);
              // Hide success indicator after 1.5s
              setTimeout(() => setSaveSuccess(false), 1500);
            } catch (error) {
              console.error("Failed to save positions:", error);
            } finally {
              setIsSaving(false);
            }
          }
        }, 500);
      }
    },
    [onNodePositionChange, isOwner]
  );

  const completedCount = inputNodes.filter(
    (n) => n.status === "completed"
  ).length;
  const progress =
    inputNodes.length > 0 ? (completedCount / inputNodes.length) * 100 : 0;

  if (!ReactFlowModule) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: theme.bgGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-3 border-white/50 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const { ReactFlow, Background, Controls, MiniMap, Panel, MarkerType } =
    ReactFlowModule;

  return (
    <>
      <ReactFlow
        nodes={draggableNodes}
        edges={draggableEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={isOwner}
        onNodesChange={isOwner ? onNodesChange : undefined}
        onNodeDragStop={isOwner ? onNodeDragStop : undefined}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "quest",
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        proOptions={{ hideAttribution: true }}
        className="z-10"
      >
        <Background color="#ffffff10" gap={32} />

        {/* Header Panel */}
        <Panel position="top-center" className="!m-0 !p-0">
          <div className="p-6 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl">{theme.icon}</span>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">{goalTitle}</h2>
                <p className="text-gray-400">
                  {completedCount} of {inputNodes.length} milestones
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 max-w-md mx-auto flex items-center gap-4">
              <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: theme.nodeActive }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <span className="text-xl font-bold text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </Panel>

        {/* MiniMap + Controls - Bottom Left (above visitor bar, below community pulse) */}
        <Panel position="bottom-left" className="!mb-36 !ml-4">
          <div className="flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="bg-slate-900/90 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
              <Controls
                className="!bg-transparent !border-0 !m-0 !p-0 !static !shadow-none [&>button]:!w-8 [&>button]:!h-8 [&>button]:!bg-transparent [&>button]:hover:!bg-white/10 [&>button]:!border-0"
                showInteractive={false}
                orientation="horizontal"
              />
            </div>
            {/* MiniMap */}
            <div className="bg-slate-900/90 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
              <MiniMap
                className="!border-0 !m-0 !static !rounded-none"
                style={{ width: 160, height: 100, background: "#1e293b" }}
                nodeColor={(node) => {
                  if (node.id === "start" || node.id === "end") return theme.pathColor;
                  const status = (node.data as { status?: string })?.status;
                  if (status === "completed") return "#22c55e";
                  if (status === "active") return "#f59e0b";
                  return "#64748b";
                }}
                maskColor="rgba(30, 41, 59, 0.7)"
                pannable
                zoomable
              />
            </div>
          </div>
        </Panel>

        {/* Instructions Panel */}
        <Panel position="bottom-center">
          <div className="flex items-center gap-4 text-gray-400 text-sm bg-black/50 px-6 py-3 rounded-full backdrop-blur-sm border border-white/10">
            {isOwner && <span>Drag nodes to reposition</span>}
            {isOwner && <span className="text-white/30">|</span>}
            <span>Drag background to pan</span>
            <span className="text-white/30">|</span>
            <span>Scroll to zoom</span>
            {/* Save indicator */}
            {(isSaving || saveSuccess) && (
              <>
                <span className="text-white/30">|</span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`flex items-center gap-1.5 ${saveSuccess ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {isSaving ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full"
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Saved</span>
                    </>
                  )}
                </motion.span>
              </>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* Node Detail Modal */}
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
              className="bg-slate-900 border border-white/20 rounded-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                      background:
                        selectedNode.status === "completed"
                          ? theme.nodeCompleted
                          : selectedNode.status === "active"
                          ? theme.nodeActive
                          : theme.nodeLocked,
                    }}
                  >
                    {selectedNode.status === "completed"
                      ? "✓"
                      : selectedNode.order}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {selectedNode.title}
                    </h3>
                    <span
                      className={`text-sm ${
                        selectedNode.status === "completed"
                          ? "text-green-400"
                          : selectedNode.status === "active"
                          ? "text-amber-400"
                          : "text-gray-500"
                      }`}
                    >
                      {selectedNode.status.charAt(0).toUpperCase() +
                        selectedNode.status.slice(1)}
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
                <p className="text-gray-300 mb-6 whitespace-pre-wrap">
                  {selectedNode.description}
                </p>
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
    </>
  );
}

export function BPMNQuestMap(props: BPMNQuestMapProps) {
  const theme = THEME_CONFIGS[props.worldTheme] || THEME_CONFIGS.mountain;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: theme.bgGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-3 border-white/50 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative"
      style={{ background: theme.bgGradient }}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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

      <BPMNQuestMapInner {...props} theme={theme} />
    </div>
  );
}
