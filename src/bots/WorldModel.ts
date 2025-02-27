import { ItemName } from "./types";

export type BlockName = ItemName | "?" | "X";

type X = Partial<Record<number, Y>>;
type Y = Partial<Record<number, Z>>;
type Z = Partial<Record<number, BlockName>>;

export class WorldModel {
  private readonly model: X = {};

  constructor(location: Vector) {
    this.set(location, "computercraft:turtle_normal");
  }

  get(location: Vector): BlockName | undefined {
    return this.model[location.x]?.[location.y]?.[location.z];
  }

  set(location: Vector, block: BlockName) {
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
}
