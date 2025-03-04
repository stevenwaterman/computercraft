import { pretty_print } from "cc.pretty";
import * as event from "../event";
import {
  a_dig,
  a_drop,
  a_move,
  a_place,
  Direction,
  inspect_name,
} from "../utils";

const saplingSlot = 1;
const bonemealSlot = 2;

const maxDistance = 2;

type Heading = "N" | "E" | "S" | "W";
type Movement = Heading | "U" | "D";

type Location = [number, number, number];

type State = {
  location: Location;
  distanceFromLog: number;
  facing: Heading;
  path: Movement[];
};

function chopRecursive(cleared: Set<string>, state: State): Heading {
  let facing = state.facing;

  const movements = adjacentUnvisited(state.location, facing, cleared);

  const lastMove = state.path[state.path.length - 1];

  // TODO: order by closest rotation
  for (const movement of movements) {
    facing = maybeRecurse(cleared, state, facing, movement);
    // pretty_print({
    //   cleared: cleared.size,
    //   facing,
    //   lastMove,
    //   path: state.path.length,
    //   distance: state.distanceFromLog,
    // });
  }

  if (lastMove === "U") {
    a_move("D");
    print("going back down");
  } else if (lastMove === "D") {
    a_move("U");
    print("going back up");
  } else if (facing === reverseOf(lastMove)) {
    a_move("F");
    print("going forwards", facing);
  } else {
    print("turning from", facing, "to", lastMove, "and going backwards");
    facing = turnToFace(facing, lastMove);
    a_move("B");
  }

  return facing;
}

function reverseOf(facing: Heading): Heading {
  switch (facing) {
    case "N":
      return "S";
    case "E":
      return "W";
    case "S":
      return "N";
    case "W":
      return "E";
  }
}

function clockwise(facing: Heading): Heading {
  switch (facing) {
    case "N":
      return "E";
    case "E":
      return "S";
    case "S":
      return "W";
    case "W":
      return "N";
  }
}

function locationAfter(
  [north, up, east]: Location,
  movement: Movement
): Location {
  switch (movement) {
    case "U":
      return [north, up + 1, east];
    case "D":
      return [north, up - 1, east];
    case "N":
      return [north + 1, up, east];
    case "E":
      return [north, up, east + 1];
    case "S":
      return [north - 1, up, east];
    case "W":
      return [north, up, east - 1];
  }
}

function adjacentUnvisited(
  location: Location,
  facing: Heading,
  cleared: Set<string>
) {
  const movements: Movement[] = [];

  if (cleared.has(locationAfter(location, "D").join(","))) {
    // print("Skipping D");
  } else {
    movements.push("D");
  }

  if (cleared.has(locationAfter(location, "U").join(","))) {
    // print("Skipping", "U");
  } else {
    movements.push("U");
  }

  const aheadHeading = facing;
  if (cleared.has(locationAfter(location, aheadHeading).join(","))) {
    // print("Skipping", aheadHeading);
  } else {
    movements.push(aheadHeading);
  }

  const rightHeading = clockwise(aheadHeading);
  if (cleared.has(locationAfter(location, rightHeading).join(","))) {
    // print("Skipping", rightHeading);
  } else {
    movements.push(rightHeading);
  }

  const backHeading = clockwise(rightHeading);
  if (cleared.has(locationAfter(location, backHeading).join(","))) {
    // print("Skipping", backHeading);
  } else {
    movements.push(backHeading);
  }

  const leftHeading = clockwise(backHeading);
  if (cleared.has(locationAfter(location, leftHeading).join(","))) {
    // print("Skipping", leftHeading);
  } else {
    movements.push(leftHeading);
  }

  return movements;
}

function maybeRecurse(
  cleared: Set<string>,
  state: State,
  facing: Heading,
  movement: Movement
): Heading {
  const direction: Direction = (
    {
      N: "F",
      E: "F",
      S: "F",
      W: "F",
      U: "U",
      D: "D",
    } as const
  )[movement];

  const newFacing = turnToFace(facing, movement);
  const block = blockType(direction);

  const newLocation = locationAfter(state.location, movement);
  cleared.add(newLocation.join(","));

  if (
    block === "wood" ||
    (block === "leaf" && state.distanceFromLog < maxDistance)
  ) {
    print("Going", movement);
    
    const [success, error] = {
      F: turtle.dig,
      U: turtle.digUp,
      D: turtle.digDown,
    }[direction]();

    a_move(direction);
    return chopRecursive(cleared, {
      location: newLocation,
      distanceFromLog: block === "wood" ? 0 : state.distanceFromLog + 1,
      facing: newFacing,
      path: [...state.path, movement],
    });
  }

  return newFacing;
}

function turnToFace(facing: Heading, movement: Movement): Heading {
  if (movement === "U" || movement === "D") return facing;

  const rotation = {
    N: 0,
    E: 1,
    S: 2,
    W: 3,
  };

  const currentRotation = rotation[facing];
  const desiredRotation = rotation[movement];
  const delta = (4 + desiredRotation - currentRotation) % 4;
  print(currentRotation, desiredRotation, delta);

  if (delta === 3) {
    print("turning left");
    turtle.turnLeft();
    return movement;
  }

  for (let i = 0; i < delta; i++) {
    print("turning right");
    turtle.turnRight();
  }

  return movement;
}

function blockType(direction: Direction): "wood" | "leaf" | "air" {
  const name = inspect_name(direction);

  if (name === "minecraft:oak_log") {
    return "wood";
  }

  if (name === "minecraft:oak_leaves") {
    return "leaf";
  }

  return "air";
}

function grow() {
  a_place("F", saplingSlot);

  turtle.select(bonemealSlot);
  while (turtle.place()[0]);
}

function chop() {
  const cleared = new Set<string>();
  cleared.add("0,0,0");
  cleared.add("1,0,0");
  a_dig("F");
  a_move("F");
  chopRecursive(cleared, {
    location: [1, 0, 0],
    distanceFromLog: 0,
    facing: "N",
    path: ["N"],
  });
}

export default function growAndChopForever() {
  while (true) {
    checkSufficientSupplies();
    grow();
    chop();
    emptyInventory();
  }
}

function checkSufficientSupplies() {
  if (turtle.getItemCount(saplingSlot) < 4) {
    throw "not enough saplings";
  }

  if (turtle.getItemCount(bonemealSlot) < 20) {
    throw "not enough bonemeal";
  }

  if ((turtle.getFuelLevel() ?? 0) < 100) {
    throw "not enough fuel";
  }
}

function emptyInventory() {
  for (let i = 3; i <= 16; i++) {
    const item = turtle.getItemDetail(i);
    if (item) {
      const table = item as LuaTable;
      const name = table.get("name");

      if (name === "minecraft:oak_sapling") {
        const transferAmount = Math.min(
          turtle.getItemSpace(saplingSlot),
          turtle.getItemCount(i)
        );
        turtle.select(i);
        turtle.transferTo(saplingSlot, transferAmount);
      } else if (name === "minecraft:bone_meal") {
        const transferAmount = Math.min(
          turtle.getItemSpace(bonemealSlot),
          turtle.getItemCount(i)
        );
        turtle.select(i);
        turtle.transferTo(bonemealSlot, transferAmount);
      } else {
        a_drop("D", i);
      }
    }
  }
}
