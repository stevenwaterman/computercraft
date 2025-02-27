import { BotImpl } from "./Bot";
import * as event from "../event";
import { Result, err, ok } from "./Result";

type RelativeHeading = 0 | 1 | 2 | 3;
type MovementLog = {
  rotation: RelativeHeading;
  forward: number;
  right: number;
};

export class MovingBot extends BotImpl {
  private readonly initialLocation: Vector = locate();

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

    if (forward !== 0 && xDelta === forward) {
      initialHeading = "+X";
    } else if (forward !== 0 && xDelta === -forward) {
      initialHeading = "-X";
    } else if (forward !== 0 && zDelta === forward) {
      initialHeading = "+Z";
    } else if (forward !== 0 && zDelta === -forward) {
      initialHeading = "-Z";
    } else if (right !== 0 && xDelta === right) {
      initialHeading = "-Z";
    } else if (right !== 0 && xDelta === -right) {
      initialHeading = "+Z";
    } else if (right !== 0 && zDelta === right) {
      initialHeading = "+X";
    } else if (right !== 0 && zDelta === -right) {
      initialHeading = "-X";
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
      this._location = locate();
    }

    return this._location;
  }

  public moveOnce({
    direction = "forwards",
  }: {
    direction?: "forwards" | "backwards" | "up" | "down";
  } = {}): Result<void> {
    const beforeLocation = this._location;

    if (this.fuel <= 0) {
      return err("Insufficient fuel");
    }

    const [success, reason] = turtle.forward();

    if (!success) {
      return err(reason!);
    }

    this.fuel--;

    if (typeof this._heading !== "string") {
      if (direction === "forwards") {
        if (this._heading.rotation === 0) {
          this._heading.forward++;
        } else if (this._heading.rotation === 1) {
          this._heading.right++;
        } else if (this._heading.rotation === 2) {
          this._heading.forward--;
        } else {
          this._heading.right--;
        }
      } else if (direction === "backwards") {
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

    if (beforeLocation !== "?") {
      if (direction === "up") {
        this._location = beforeLocation.add(new Vector(0, 1, 0));
      } else if (direction === "down") {
        this._location = beforeLocation.add(new Vector(0, -1, 0));
      } else if (direction === "forwards" && this.heading.ok) {
        this._location = addHeading(beforeLocation, this.heading.value);
      } else if (direction === "backwards" && this.heading.ok) {
        this._location = addHeading(
          beforeLocation,
          rotateHeading(this.heading.value, 2)
        );
      } else {
        this._location = "?";
      }
    }

    return ok(undefined);
  }
}

function locate() {
  const [x, y, z] = gps.locate();
  return new Vector(x, y, z);
}

type Heading = "+X" | "-X" | "+Z" | "-Z";

function addHeading(location: Vector, heading: Heading): Vector {
  if (heading === "+X") {
    return location.add(new Vector(1, 0, 0));
  }

  if (heading === "-X") {
    return location.sub(new Vector(1, 0, 0));
  }

  if (heading === "+Z") {
    return location.add(new Vector(0, 0, 1));
  }

  if (heading === "-Z") {
    return location.sub(new Vector(0, 0, -1));
  }

  const allHandled: never = heading;
  throw "impossible";
}

function rotateHeading(heading: Heading, clockwise90: number): Heading {
  const headings: Heading[] = ["-Z", "+X", "+Z", "-X"];
  const initial = headings.indexOf(heading);
  const rotated = initial + clockwise90;
  const bounded = ((rotated % 4) + 4) % 4;
  return headings[bounded];
}
