import type { RoutingGraph, WeightedEdge } from "./types.js";

function nodeId(id: number): string {
  return String(id);
}

/** Ensures every endpoint appears as a top-level key so Dijkstra initializes distances. */
export function buildRoutingGraph(edges: WeightedEdge[]): RoutingGraph {
  const graph: RoutingGraph = {};
  for (const e of edges) {
    const a = nodeId(e.from);
    const b = nodeId(e.to);
    if (!graph[a]) graph[a] = {};
    if (!graph[b]) graph[b] = {};
    graph[a][b] = e.weight;
  }
  return graph;
}

export function pathWeight(graph: RoutingGraph, path: string[]): number {
  let sum = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const w = graph[a]?.[b];
    if (w === undefined) return Number.POSITIVE_INFINITY;
    sum += w;
  }
  return sum;
}
