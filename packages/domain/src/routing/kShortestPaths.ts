import { dijkstra } from "./dijkstra.js";
import { pathWeight } from "./graph.js";
import type { DijkstraResult, RoutingGraph } from "./types.js";

function cloneGraph(graph: RoutingGraph): RoutingGraph {
  return JSON.parse(JSON.stringify(graph)) as RoutingGraph;
}

function removeEdge(graph: RoutingGraph, from: string, to: string): void {
  if (graph[from]) {
    delete graph[from][to];
  }
}

/**
 * Yen's-style k shortest simple paths (legacy-compatible behaviour, with sane candidate sorting).
 */
export function kShortestPaths(
  graph: RoutingGraph,
  start: string,
  end: string,
  k: number,
): DijkstraResult[] {
  const paths: DijkstraResult[] = [];
  const candidates: DijkstraResult[] = [];

  const firstPath = dijkstra(graph, start, end);
  if (!firstPath.path.length) return [];

  paths.push(firstPath);

  for (let i = 1; i < k; i++) {
    for (let j = 0; j < paths[i - 1]!.path.length - 1; j++) {
      const spurNode = paths[i - 1]!.path[j]!;
      const rootPath = paths[i - 1]!.path.slice(0, j + 1);

      const graphClone = cloneGraph(graph);

      for (const p of paths) {
        if (
          JSON.stringify(p.path.slice(0, j + 1)) === JSON.stringify(rootPath) &&
          p.path.length > j + 1
        ) {
          removeEdge(graphClone, p.path[j]!, p.path[j + 1]!);
        }
      }

      const spurPathResult = dijkstra(graphClone, spurNode, end);

      if (spurPathResult.path.length > 0) {
        const totalPath = rootPath.slice(0, -1).concat(spurPathResult.path);
        candidates.push({
          path: totalPath,
          distance: pathWeight(graph, totalPath),
        });
      }
    }

    if (candidates.length === 0) break;

    candidates.sort((a, b) => a.distance - b.distance);
    const next = candidates.shift();
    if (next) paths.push(next);
  }

  return paths;
}
