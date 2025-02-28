import { ItemName } from "./types";

export type BlockName = ItemName | "?" | "X";

type X = Partial<Record<number, Y>>;
type Y = Partial<Record<number, Z>>;
type Z = Partial<Record<number, BlockName>>;

export class WorldModel {
  private readonly model: X = {};
  private readonly reverseLookup: Partial<Record<ItemName, Set<string>>> = {};

  constructor(location: Vector) {
    this.set(location, "computercraft:turtle_normal");
  }

  get(location: Vector): BlockName | undefined {
    return this.model[location.x]?.[location.y]?.[location.z];
  }

  traversable(location: Vector): boolean {
    const block = this.get(location);
    return block === undefined || block === "X";
  }

  set(location: Vector, block: BlockName) {
    if (block !== "?" && block !== "X") {
      const key = `${location.x},${location.y},${location.z}`;
      const reverse = this.reverseLookup[block];
      if (reverse === undefined) {
        this.reverseLookup[block] = new Set([key]);
      } else {
        reverse.add(key);
      }
    }

    const y = this.model[location.x];
    if (y === undefined) {
      this.model[location.x] = {
        [location.y]: {
          [location.z]: block,
        },
      };
      return;
    }

    const z = y[location.y];
    if (z === undefined) {
      y[location.y] = {
        [location.z]: block,
      };
      return;
    }

    z[location.z] = block;
  }

  clear(location: Vector) {
    this.set(location, "X");
  }

  find(block: ItemName): Vector[] {
    const keys = this.reverseLookup[block];
    if (keys === undefined) return [];
    return [...keys].map((key) => {
      const [x, y, z] = key.split(",");
      return new Vector(parseInt(x), parseInt(y), parseInt(z));
    });
  }
}
