import { WorldModel } from "./WorldModel";
import { Direction, Heading, addHeading, rotateHeading } from "./types";

type Node = {
  heading: Heading;
  location: Vector;
};

function manhattanDistance(a: Vector, b: Vector): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

function neighbours(node: Node): Node[] {
  const up: Node = {
    heading: node.heading,
    location: node.location.add(new Vector(0, 1, 0)),
  };

  const down: Node = {
    heading: node.heading,
    location: node.location.add(new Vector(0, -1, 0)),
  };

  const forwards: Node = {
    heading: node.heading,
    location: addHeading(node.location, node.heading),
  };

  const back: Node = {
    heading: node.heading,
    location: addHeading(node.location, rotateHeading(node.heading, 2)),
  };

  const left: Node = {
    heading: rotateHeading(node.heading, 3),
    location: node.location,
  };

  const right: Node = {
    heading: rotateHeading(node.heading, 1),
    location: node.location,
  };

  return [up, down, forwards, back, left, right];
}

function key(node: Node): string {
  return `${node.heading},${node.location.x},${node.location.y},${node.location.z}`;
}

function value(key: string): Node {
  const [heading, x, y, z] = key.split(",");
  return {
    heading: heading as Heading,
    location: new Vector(parseInt(x), parseInt(y), parseInt(z)),
  };
}

export function planPath({
  fromLocation,
  fromHeading,
  toLocation,
  toHeading,
  worldModel,
}: {
  fromLocation: Vector;
  fromHeading: Heading;
  toLocation: Vector;
  toHeading?: Heading;
  worldModel: WorldModel;
}): Direction[] | null {
  const from = {
    heading: fromHeading,
    location: fromLocation,
  };

  const to = {
    heading: toHeading,
    location: toLocation,
  };

  const nodesToVisit = new Set<string>();
  const visitedNodes = new Set<string>();
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const cameFrom: Record<string, Node> = {};

  gScore[key(from)] = 0;
  fScore[key(from)] = manhattanDistance(from.location, to.location);
  nodesToVisit.add(key(from));

  while (nodesToVisit.size > 0) {
    let currentKey: string | null = null;
    let minF: number = Infinity;
    for (let nodeKey of nodesToVisit) {
      const f = fScore[nodeKey] ?? Infinity;
      if (f < minF) {
        minF = f;
        currentKey = nodeKey;
      }
    }

    if (!currentKey) return null;

    const current = value(currentKey);

    const isFinalLocation = current.location.equals(to.location);
    const isFinalHeading =
      to.heading === undefined || current.heading === to.heading;
    if (isFinalLocation && isFinalHeading) {
      return getPath(cameFrom, current);
    }

    nodesToVisit.delete(currentKey);
    visitedNodes.add(currentKey);

    const tentativeGScore = (gScore[currentKey] ?? Infinity) + 1;

    for (const neighbour of neighbours(current)) {
      const neighborKey: string = key(neighbour);

      if (visitedNodes.has(neighborKey)) {
        continue;
      }

      if (!worldModel.traversable(neighbour.location)) {
        continue;
      }

      if (tentativeGScore < (gScore[neighborKey] ?? Infinity)) {
        cameFrom[neighborKey] = current;
        gScore[neighborKey] = tentativeGScore;
        fScore[neighborKey] =
          tentativeGScore + manhattanDistance(neighbour.location, to.location);
        nodesToVisit.add(neighborKey);
      }
    }
  }

  return null; // No path found
}

function getPath(cameFrom: Record<string, Node>, to: Node): Direction[] {
  const locations: Node[] = [to];
  const path: Direction[] = [];

  let current: Node = to;
  while (true) {
    const prev = cameFrom[key(current)];

    if (prev == undefined) {
      return path;
    }

    // You rotated
    if (current.location.equals(prev.location)) {
      current = prev;
      continue;
    }

    locations.unshift(prev);

    if (current.location.x === prev.location.x + 1) {
      path.unshift("+X");
    } else if (current.location.x === prev.location.x - 1) {
      path.unshift("-X");
    } else if (current.location.y === prev.location.y + 1) {
      path.unshift("+Y");
    } else if (current.location.y === prev.location.y - 1) {
      path.unshift("-Y");
    } else if (current.location.z === prev.location.z + 1) {
      path.unshift("+Z");
    } else if (current.location.z === prev.location.z - 1) {
      path.unshift("-Z");
    } else {
      throw "Non-adjacent nodes";
    }

    current = prev;
  }
}
