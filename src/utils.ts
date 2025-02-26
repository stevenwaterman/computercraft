export type Direction = "F" | "U" | "D";

export function digBlock(block: "minecraft:cobblestone") {
  while (true) {
    const [success, data] = turtle.inspect();
    if (success) {
      const table = data as LuaTable;
      if (table.get("name") === block) {
        turtle.dig();
        return;
      }
    }
  }
}

export function a_move(direction: Direction | "B" = "F") {
  const [success, error] = {
    F: turtle.forward,
    U: turtle.up,
    D: turtle.down,
    B: turtle.back,
  }[direction]();

  if (!success) {
    throw error;
  }
}

export function a_dig(direction: Direction = "F") {
  const [success, error] = {
    F: turtle.dig,
    U: turtle.digUp,
    D: turtle.digDown,
  }[direction]();

  if (!success) {
    throw error;
  }
}

export function inspect_name(direction: Direction = "F"): string | undefined {
  const [success, data] = {
    F: turtle.inspect,
    U: turtle.inspectUp,
    D: turtle.inspectDown,
  }[direction]();

  if (!success) {
    return undefined;
  }

  const table = data as LuaTable;
  return table.get("name");
}

export function slot_name(slot: number): string | undefined {
  const detail = turtle.getItemDetail(slot);

  if (detail === undefined) {
    return undefined;
  }

  const table = detail as LuaTable;
  return table.get("name");
}

export function a_place(direction: Direction = "F", slot: number) {
  if (turtle.getSelectedSlot() !== slot) {
    turtle.select(slot);
  }

  const [success, error] = {
    F: turtle.place,
    U: turtle.placeUp,
    D: turtle.placeDown,
  }[direction]();

  if (!success) {
    throw error;
  }
}

export function a_drop(direction: Direction = "F", slot: number) {
  if (turtle.getSelectedSlot() !== slot) {
    turtle.select(slot);
  }

  const [success, error] = {
    F: turtle.drop,
    U: turtle.dropUp,
    D: turtle.dropDown,
  }[direction]();

  if (!success) {
    throw error;
  }
}

export function a_transfer(from: number, to: number, amount?: number) {
  if (turtle.getSelectedSlot() !== from) {
    turtle.select(from);
  }

  const success = turtle.transferTo(to, amount);
  if (!success) {
    throw "Could not transfer";
  }
}
