export type SlotIdx =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export const slotIndexes: SlotIdx[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

export type Face = "front" | "up" | "down";

export type ItemName = `minecraft:${string}` | `computercraft:${string}`;

export type Heading = "+X" | "-X" | "+Z" | "-Z";
export type Direction = Heading | "+Y" | "-Y";

export function addHeading(location: Vector, heading: Heading): Vector {
  if (heading === "+X") {
    return location.add(new Vector(1, 0, 0));
  }

  if (heading === "-X") {
    return location.add(new Vector(-1, 0, 0));
  }

  if (heading === "+Z") {
    return location.add(new Vector(0, 0, 1));
  }

  if (heading === "-Z") {
    return location.add(new Vector(0, 0, -1));
  }

  const allHandled: never = heading;
  throw "impossible";
}

export type RelativeHeading = 0 | 1 | 2 | 3;

export function rotateHeading(heading: Heading, clockwise90: number): Heading {
  const headings: Heading[] = ["-Z", "+X", "+Z", "-X"];
  const initial = headings.indexOf(heading);
  const rotated = initial + clockwise90;
  const bounded = ((rotated % 4) + 4) % 4;
  return headings[bounded];
}

export function rotationsBetween(current: Heading, target: Heading): RelativeHeading {
  const headings: Heading[] = ["-Z", "+X", "+Z", "-X"];
  const currentRelative = headings.indexOf(current);
  const targetRelative = headings.indexOf(target);
  const rotationNeeded = targetRelative - currentRelative;
  const bounded = ((rotationNeeded % 4) + 4) % 4;
  return bounded as 0 | 1 | 2 | 3;
}
