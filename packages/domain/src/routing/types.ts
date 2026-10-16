/** Adjacency map: node id -> (neighbor id -> edge weight). */
export type RoutingGraph = Record<string, Record<string, number>>;

export type DijkstraResult = {
  path: string[];
  distance: number;
};

export type WeightedEdge = {
  from: number;
  to: number;
  weight: number;
};
