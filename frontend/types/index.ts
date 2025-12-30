export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  level: number;
  streak_days: number;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "private" | "friends";
  status: "planning" | "active" | "completed" | "abandoned";
  world_theme: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export type NodeType = "task" | "parallel_start" | "parallel_end" | "milestone";
export type DependencyType = "finish_to_start" | "start_to_start" | "finish_to_finish";

export interface NodeDependency {
  id: string;
  node_id: string;
  depends_on_id: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface Node {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  order: number;
  status: "locked" | "active" | "completed" | "failed";
  position_x: number;
  position_y: number;
  extra_data: Record<string, unknown>;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  // BPMN fields
  node_type: NodeType;
  can_parallel: boolean;
  estimated_duration: number | null;
}

export interface NodeWithDependencies extends Node {
  depends_on: NodeDependency[];
  dependents: NodeDependency[];
}

export interface Update {
  id: string;
  node_id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  update_type: "progress" | "milestone" | "struggle" | "celebration";
  created_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  target_type: "node" | "update" | "goal";
  target_id: string;
  interaction_type: "comment" | "reaction";
  content: string | null;
  reaction_type: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  xp_reward: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
