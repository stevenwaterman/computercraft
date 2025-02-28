import { BotImpl } from "./Bot";
import { Result, err, ok } from "./Result";
import { BlockName, WorldModel } from "./WorldModel";
import { Direction, Face, Heading, ItemName, RelativeHeading, addHeading, rotateHeading, rotationsBetween } from "./types";
import { planPath } from "./Pathfinding";

type MovementLog = {
  rotation: RelativeHeading;
  forward: number;
  right: number;
};

export class MovingBot extends BotImpl {
  private readonly initialLocation: Vector = getLocationFromGps();
  public readonly worldModel: WorldModel = new WorldModel(
    this.initialLocation
  );

  private _heading: Heading | MovementLog = {
    rotation: 0,
    forward: 0,
    right: 0,
  };

  public get heading(): Result<Heading> {
    if (typeof this._heading === "string") return ok(this._heading);

    const { rotation, forward, right } = this._heading;
    if (forward === right) {
      return err(
        `Cannot determine heading, you have moved [${right}, ${forward}]`
      );
    }

    const oldLocation = this.initialLocation;
    const newLocation = this.location;

    const xDelta = newLocation.x - oldLocation.x;
    const zDelta = newLocation.z - oldLocation.z;
    let initialHeading: Heading | undefined = undefined;

    if (forward === xDelta && right === zDelta) {
      initialHeading = "+X";
    } else if (forward === zDelta && right === -xDelta) {
      initialHeading = "+Z";
    } else if (forward === -xDelta && right === -zDelta) {
      initialHeading = "-X";
    } else if (forward === -zDelta && right === xDelta) {
      initialHeading = "-Z";
    }

    if (initialHeading === undefined) {
      return err(
        `Move tracking broke, you moved from ${oldLocation} to ${newLocation} by going ${forward} forward and ${right} right`
      );
    }

    this._heading = rotateHeading(initialHeading, rotation);
    return ok(this._heading);
  }

  protected _location: Vector | "?" = this.initialLocation;

  public get location(): Vector {
    if (this._location === "?") {
      this._location = getLocationFromGps();
    }

    return this._location;
  }

  public moveOnce({
    direction = "front",
  }: {
    direction?: Face | "back";
  } = {}): Result<void> {
    const beforeLocation = this.location;

    if (this.fuel <= 0) {
      return err("Insufficient fuel");
    }

    const [success, reason] = moveFunc[direction]();

    if (!success) {
      if (direction === "back") {
        this.locationOnFace(direction).ifOk((target) =>
          this.worldModel.set(target, "?")
        );
      } else {
        this.inspect({ face: direction });
      }
      return err(reason!);
    }

    this.fuel--;

    if (typeof this._heading !== "string") {
      if (direction === "front") {
        if (this._heading.rotation === 0) {
          this._heading.forward++;
        } else if (this._heading.rotation === 1) {
          this._heading.right++;
        } else if (this._heading.rotation === 2) {
          this._heading.forward--;
        } else {
          this._heading.right--;
        }
      } else if (direction === "back") {
        if (this._heading.rotation === 0) {
          this._heading.forward--;
        } else if (this._heading.rotation === 1) {
          this._heading.right--;
        } else if (this._heading.rotation === 2) {
          this._heading.forward++;
        } else {
          this._heading.right++;
        }
      }
    }

    if (direction === "up") {
      this._location = beforeLocation.add(new Vector(0, 1, 0));
    } else if (direction === "down") {
      this._location = beforeLocation.add(new Vector(0, -1, 0));
    } else if (direction === "front" && this.heading.ok) {
      this._location = addHeading(beforeLocation, this.heading.value);
    } else if (direction === "back" && this.heading.ok) {
      this._location = addHeading(
        beforeLocation,
        rotateHeading(this.heading.value, 2)
      );
    } else {
      this._location = "?";
    }

    this.worldModel.clear(beforeLocation);
    this.worldModel.set(this.location, "computercraft:turtle_normal");

    if (direction !== "back") {
      this.inspect({ face: "front" });
    }

    if (direction !== "down") {
      this.inspect({ face: "up" });
    }

    if (direction !== "up") {
      this.inspect({ face: "down" });
    }

    return ok(undefined);
  }

  public turn({ amount = 1 }: { amount?: number } = {}): Result<void> {
    const normalisedAmount = (((amount % 4) + 4) % 4) as RelativeHeading;

    if (normalisedAmount === 0) {
      return ok(undefined);
    }

    if (typeof this._heading === "string") {
      this._heading = rotateHeading(this._heading, normalisedAmount);
    } else {
      const newRotation = (this._heading.rotation + normalisedAmount) % 4;
      this._heading.rotation = newRotation as RelativeHeading;
    }

    if (normalisedAmount === 1) {
      const [success, reason] = turtle.turnRight();
      if (!success) {
        return err(reason!);
      }
      this.inspect();

      return ok(undefined);
    }

    if (normalisedAmount === 2) {
      const [success1, reason1] = turtle.turnRight();
      if (!success1) {
        return err(reason1!);
      }
      this.inspect();

      const [success2, reason2] = turtle.turnRight();
      if (!success2) {
        return err(reason2!);
      }
      this.inspect();

      return ok(undefined);
    }

    if (normalisedAmount === 3) {
      const [success, reason] = turtle.turnLeft();
      if (!success) {
        return err(reason!);
      }
      this.inspect();

      return ok(undefined);
    }

    const handledAll: never = normalisedAmount;
    throw "impossible";
  }

  public turnToFace(targetHeading: Heading): Result<void> {
    const heading = this.heading;
    if (!heading.ok) {
      return heading;
    }

    const rotations = rotationsBetween(heading.value, targetHeading);
    return this.turn({ amount: rotations });
  }

  public moveMany(...movements: Movement[]): Result<void> {
    for (const movement of movements) {
      const [direction, amount]: [Direction, number] =
        typeof movement === "string" ? [movement, 1] : movement;

      for (let i = 0; i < amount; i++) {
        if (direction === "+Y") {
          const result = this.moveOnce({ direction: "up" });
          if (!result.ok) {
            return result;
          }
        } else if (direction === "-Y") {
          const result = this.moveOnce({ direction: "down" });
          if (!result.ok) {
            return result;
          }
        } else {
          const turnResult = this.turnToFace(direction);
          if (!turnResult.ok) {
            return turnResult;
          }

          const result = this.moveOnce({ direction: "front" });
          if (!result.ok) {
            return result;
          }
        }
      }
    }

    return ok(undefined);
  }

  public goTo(location: Vector): Result<void> {
    while (true) {
      const plannedPath = planPath({
        fromLocation: this.location,
        fromHeading: this.heading.assert(),
        toLocation: location,
        worldModel: this.worldModel,
      });

      if (plannedPath === null) {
        return err("Cannot pathfind there");
      }

      const result = this.moveMany(...plannedPath);
      if (result.ok) {
        return result;
      } else if (result.error !== "Movement obstructed") {
        print(result.error);
      }
    }
  }

  public dig({ face = "front" }: { face?: Face } = {}) {
    const result = super.dig({ face });

    result.and(this.locationOnFace(face)).map(([_, dugLocation]) => {
      this.worldModel.clear(dugLocation);
    });

    return result;
  }

  private locationOnFace(face: Face | "back"): Result<Vector> {
    if (face === "up") {
      return ok(this.location.add(new Vector(0, 1, 0)));
    } else if (face === "down") {
      return ok(this.location.add(new Vector(0, -1, 0)));
    } else if (face === "front") {
      return this.heading.map((heading) => addHeading(this.location, heading));
    } else if (face === "back") {
      return this.heading.map((heading) =>
        addHeading(this.location, rotateHeading(heading, 2))
      );
    }

    const handledAll: never = face;
    throw "impossible";
  }

  public inspect({ face = "front" }: { face?: Face } = {}): ItemName | "X" {
    const [isBlock, data] = inspectFunc[face]();

    if (!isBlock) {
      this.locationOnFace(face).ifOk((location) => {
        this.worldModel.clear(location);
      });
      return "X";
    }

    const table = data as LuaTable;
    const name = table.get("name") as ItemName;
    this.locationOnFace(face).ifOk((location) =>
      this.worldModel.set(location, name)
    );
    return name;
  }

  public ensureHeading(): Result<void> {
    if (this.heading.ok) {
      return ok(undefined);
    }

    for (let i = 0; i < 4; i++) {
      const result = this.moveOnce({ direction: "front" });
      if (result.ok) {
        this.heading.assert();
        this.moveOnce({ direction: "back" }).assert();
        return ok(undefined);
      }

      this.turn({ amount: 1 });
    }

    return err("Trapped on all sides");
  }
}

const inspectFunc = {
  front: turtle.inspect,
  up: turtle.inspectUp,
  down: turtle.inspectDown,
};

const moveFunc = {
  front: turtle.forward,
  up: turtle.up,
  down: turtle.down,
  back: turtle.back,
};

function getLocationFromGps(): Vector {
  const [x, y, z] = gps.locate();
  return new Vector(x, y, z);
}

type Movement = Direction | [Direction, number];
