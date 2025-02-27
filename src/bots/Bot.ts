import * as event from "../event";
import { Result, err, ok } from "./Result";
import { Face, ItemName, SlotIdx, slotIndexes } from "./types";

const suckFunc = {
  front: turtle.suck,
  up: turtle.suckUp,
  down: turtle.suckDown,
};

const dropFunc = {
  front: turtle.drop,
  up: turtle.dropUp,
  down: turtle.dropDown,
};

const attackFunc = {
  front: turtle.attack,
  up: turtle.attackUp,
  down: turtle.attackDown,
};

const inspectFunc = {
  front: turtle.inspect,
  up: turtle.inspectUp,
  down: turtle.inspectDown,
};

const digFunc = {
  front: turtle.dig,
  up: turtle.digUp,
  down: turtle.digDown,
};

class InventorySlot {
  private _name: ItemName | null | "?" = "?";
  private _count: number | "?" = "?";
  private _maxStackSize: number | null | "?" = "?";

  public invalidateCount() {
    this._count = "?";
  }

  public invalidate() {
    this._name = "?";
    this._count = "?";
    this._maxStackSize = "?";
  }

  public get name(): ItemName | null {
    if (this.count === 0) {
      this.name = null;
      return null;
    }

    if (this._name === "?") {
      const data = turtle.getItemDetail(this.idx + 1);
      if (data === undefined) {
        this.count = 0;
        return null;
      }

      const table = data as LuaTable;
      const name = table.get("name");
      const count = table.get("count");
      this.name = name;
      this.count = count;
      return name;
    }

    return this._name;
  }

  public set name(value: ItemName | null) {
    if (value === null) {
      this._maxStackSize = null;
    } else if (this._name !== value) {
      this._maxStackSize = "?";
    }

    this._name = value;
  }

  public get count(): number {
    if (this._count === "?") {
      this._count = turtle.getItemCount(this.idx + 1) ?? 0;
      if (this._count === 0) {
        this.name = null;
      }
    }

    return this._count;
  }

  public set count(value: number) {
    if (value < 0 || value > 64) {
      throw value + " is outside range for inventory slot count";
    }

    if (value === 0) {
      this.name = null;
    }

    this._count = value;
  }

  public get empty(): boolean {
    return this.count === 0;
  }

  public get maxStackSize(): number | null {
    if (this._maxStackSize === "?") {
      if (this.empty) {
        return null;
      } else {
        this._maxStackSize = this.count + turtle.getItemSpace(this.idx + 1);
      }
    }

    return this._maxStackSize;
  }

  public get space(): number | null {
    const maxStack = this.maxStackSize;
    if (maxStack === null) {
      return null;
    }

    return maxStack - this.count;
  }

  public get full(): boolean {
    return this.space === 0;
  }

  private get selected(): boolean {
    return this.inventory.selectedIdx === this.idx;
  }

  public select() {
    if (!this.selected) {
      this.inventory.selectedIdx = this.idx;
      turtle.select(this.idx + 1);
    }
  }

  public drop({
    face = "front",
    amount = "all",
  }: {
    face?: Face;
    amount?: number | "all";
  } = {}): Result<void> {
    if (this.empty) {
      return ok(undefined);
    }

    this.select();
    const [success, reason] = dropFunc[face](
      amount === "all" ? undefined : amount
    );

    if (!success) {
      return err(reason!);
    }

    if (amount === "all" || (this._count !== "?" && this._count <= amount)) {
      this.count = 0;
    } else if (this._count !== "?") {
      this.count -= amount;
    }

    return ok(undefined);
  }

  public refuel({
    amount = "all",
  }: {
    amount?: number | "all";
  } = {}): Result<void> {
    if (this.empty) {
      return ok(undefined);
    }

    this.select();
    const [success, reason] = turtle.refuel(
      amount === "all" ? undefined : amount
    );

    if (!success) {
      return err(reason!);
    }

    if (amount === "all" || (this._count !== "?" && this._count <= amount)) {
      this.count = 0;
    } else if (this._count !== "?") {
      this.count -= amount;
    }

    return ok(undefined);
  }

  public transferTo({
    target,
    amount = "all",
  }: {
    target: InventorySlot;
    amount?: number | "all";
  }): Result<number> {
    const itemName = this.name;

    if (!target.empty && target.name !== itemName) {
      return err("Target has a different item in it");
    }

    const maxTransfer: number =
      target.space === null ? this.count : Math.min(this.count, target.space);

    const amountToTransfer = amount === "all" ? maxTransfer : amount;
    if (amountToTransfer > maxTransfer) {
      return err("Can't transfer that many");
    }

    this.select();
    const success = turtle.transferTo(target.idx + 1, amountToTransfer);

    if (!success) {
      return err("Can't transfer items");
    }

    target._name = itemName;
    target._maxStackSize = this._maxStackSize;
    target.count += amountToTransfer;

    this.count -= amountToTransfer;

    return ok(amountToTransfer);
  }

  constructor(
    private readonly inventory: BotImpl,
    public readonly idx: SlotIdx
  ) {}
}

export interface Bot {
  items: Record<ItemName, number>;

  suck({
    face = "front",
    amount = "all",
  }?: {
    face?: Face;
    amount?: number | "all";
  }): Result<void>;

  suckAll({ face = "front" }?: { face?: Face }): void;

  drop({
    face = "front",
    amount = "all",
  }?: {
    face?: Face;
    amount?: Record<ItemName, number> | "all";
  }): Result<void>;

  refuel({
    amount = "all",
  }?: {
    amount?: Record<ItemName, number> | "all";
  }): Result<void>;

  dig({ face = "front" }?: { face?: Face }): Result<void>;
}

export class BotImpl implements Bot {
  public selectedIdx: number = turtle.getSelectedSlot() - 1;
  private slots: InventorySlot[] = slotIndexes.map(
    (slot) => new InventorySlot(this, slot)
  );

  private _fuel: number | "?" = "?";
  protected get fuel(): number {
    if (this._fuel === "?") {
      this._fuel = turtle.getFuelLevel();
    }
    return this._fuel;
  }
  protected set fuel(value: number) {
    this._fuel = value;
  }

  private get selected(): InventorySlot {
    return this.slots[this.selectedIdx];
  }

  public get items(): Record<ItemName, number> {
    const results: Record<ItemName, number> = {};
    for (const slot of this.slots) {
      const name = slot.name;
      if (name !== null) {
        const current = results[name] ?? 0;
        results[name] = current + slot.count;
      }
    }

    return results;
  }

  private makeSpace(): Result<InventorySlot> {
    const emptySlot = this.slots.find((slot) => slot.empty);
    if (emptySlot !== undefined) {
      return ok(emptySlot);
    }

    this.defragment();

    const emptySlot2 = this.slots.find((slot) => slot.empty);
    if (emptySlot2 !== undefined) {
      return ok(emptySlot2);
    } else {
      return err("Could not make space");
    }
  }

  private defragment() {
    const fragmentedSlots: InventorySlot[] = this.slots.filter(
      (slot) => !slot.empty && !slot.full
    );
    const items: Set<ItemName> = new Set(
      fragmentedSlots.map((slot) => slot.name!)
    );

    for (const item of items) {
      const slotsWithItem = fragmentedSlots.filter(
        (slot) => slot.name === item
      );

      this.defragmentItem(slotsWithItem);
    }
  }

  /**
   * Slots must all have the same item in them
   */
  private defragmentItem(slots: InventorySlot[]) {
    // Sort ascending
    slots.sort((a, b) => a.count - b.count);

    let sourceIdx = 0;
    let targetIdx = slots.length - 1;

    while (sourceIdx < targetIdx) {
      const source = slots[sourceIdx];
      const target = slots[targetIdx];

      source.transferTo({ target }).assert();

      if (source.empty) {
        sourceIdx++;
      }

      if (target.full) {
        targetIdx--;
      }
    }
  }

  public suck({
    face = "front",
    amount = "all",
  }: {
    face?: Face;
    amount?: number | "all";
  } = {}): Result<void> {
    this.makeSpace();

    const [success, reason] = suckFunc[face](
      amount === "all" ? undefined : amount
    );

    if (!success) {
      return err(reason!);
    }

    this.slots.forEach((slot) => slot.invalidateCount());
    return ok(undefined);
  }

  public suckAll({
    face = "front",
  }: {
    face?: Face;
  } = {}): void {
    this.makeSpace();

    while (true) {
      const [success, _] = suckFunc[face]();
      if (!success) {
        break;
      }
    }
  }

  drop({
    face = "front",
    amount = "all",
  }: {
    face?: Face;
    amount?: Record<ItemName, number> | "all";
  } = {}): Result<void> {
    if (amount === "all") {
      this.slots.forEach((slot) => slot.drop({ face }).assert());
      return ok(undefined);
    }

    const remaining: Record<ItemName, number> = { ...amount };
    const toDrop: Array<[InventorySlot, number]> = [];
    for (const slot of this.slots) {
      if (slot.name !== null) {
        const maxDrop = remaining[slot.name] ?? 0;
        const dropAmount = Math.min(slot.count, maxDrop);
        if (dropAmount > 0) {
          toDrop.push([slot, dropAmount]);
          remaining[slot.name] -= dropAmount;

          if (remaining[slot.name] === 0) {
            delete remaining[slot.name];
          }
        }
      }
    }

    const notEnoughOf = Object.keys(remaining);
    if (notEnoughOf.length > 0) {
      return err("Not enough " + notEnoughOf.join());
    }

    toDrop.forEach(([slot, amount]) => {
      slot.drop({ face, amount }).assert();
    });

    return ok(undefined);
  }

  refuel({
    amount = "all",
  }: {
    amount?: Record<ItemName, number> | "all";
  } = {}): Result<void> {
    if (amount === "all") {
      this.slots.forEach((slot) => slot.refuel().assert());
      this._fuel = "?";
      return ok(undefined);
    }

    const remaining: Record<ItemName, number> = { ...amount };
    const toRefuel: Array<[InventorySlot, number]> = [];
    for (const slot of this.slots) {
      if (slot.name !== null) {
        const maxRefuel = remaining[slot.name] ?? 0;
        const refuelAmount = Math.min(slot.count, maxRefuel);
        if (refuelAmount > 0) {
          toRefuel.push([slot, refuelAmount]);
          remaining[slot.name] -= refuelAmount;

          if (remaining[slot.name] === 0) {
            delete remaining[slot.name];
          }
        }
      }
    }

    const notEnoughOf = Object.keys(remaining);
    if (notEnoughOf.length > 0) {
      return err("Not enough " + notEnoughOf.join());
    }

    toRefuel.forEach(([slot, amount]) => {
      slot.refuel({ amount }).assert();
    });
    this._fuel = "?";

    return ok(undefined);
  }

  private equipment: Equipment | null | "?" = "?";

  private ensureEquipped(item: Equipment): Result<void> {
    // Already equipped
    if (this.equipment === item) {
      return ok(undefined);
    }

    // Check inventory
    const inventorySlot = this.slots.find((slot) => slot.name === item);

    // If it's in the inventory and there's only 1 there, we can equip it directly and skip a lot of steps
    if (inventorySlot !== undefined && inventorySlot.count === 1) {
      const oldEquipment = this.equipment as Equipment;
      inventorySlot.select();
      const [success, reason] = turtle.equipLeft();
      if (!success) {
        return err(reason);
      }

      this.equipment = inventorySlot.name as Equipment;
      inventorySlot.name = oldEquipment;
      inventorySlot.count = 1;

      return ok(undefined);
    }

    // If it's not in the inventory and we know it's not equipped, error
    if (inventorySlot === undefined && this.equipment !== "?") {
      return err("I don't have that item");
    }

    const emptySlot = this.makeSpace().assert();

    // If it's not in the inventory but it might be equipped, check
    if (inventorySlot === undefined) {
      emptySlot.select();
      emptySlot.invalidate();
      const [success, reason] = turtle.equipLeft();
      if (!success) {
        return err(reason);
      }

      // Find out what it was then re-equip it
      const name = emptySlot.name;
      const [success2, reason2] = turtle.equipLeft();
      if (!success2) {
        return err(reason2);
      }

      this.equipment = name as Equipment;
      emptySlot.count--;

      if (name === item) {
        return ok(undefined);
      } else {
        return err("I don't have that item");
      }
    }

    // If it's in the inventory and we need to equip it

    // Remove what's currently equipped
    if (this.equipment !== null) {
      emptySlot.select();
      emptySlot.invalidate();
      const [success, reason] = turtle.equipLeft();
      if (!success) {
        return err(reason);
      }
      this.equipment = null;
    }

    // Equip from inventory
    inventorySlot.select();
    this.equipment = inventorySlot.name as Equipment;
    const [success, reason] = turtle.equipLeft();
    if (!success) {
      return err(reason);
    }
    inventorySlot.count--;
    return ok(undefined);
  }

  public dig({ face = "front" }: { face?: Face } = {}) {
    this.ensureEquipped("minecraft:diamond_pickaxe");
    // TODO check what happens when you dig with full inventory

    const [inspectSuccess, data] = inspectFunc[face]();
    if (!inspectSuccess) {
      return err(data as string);
    }

    const table = data as LuaTable;
    const name: ItemName = table.get("name");

    const slot =
      this.slots.find((slot) => !slot.full && slot.name === name) ??
      this.makeSpace().default(this.selected);

    slot.select();

    const beforeCount = slot.count;
    slot.invalidateCount();

    const [digSuccess, reason] = digFunc[face]();
    if (!digSuccess) {
      return err(reason!);
    }

    const afterCount = slot.count;
    if (afterCount === beforeCount) {
      // It maybe went in a different slot
      this.slots.forEach((slot) => slot.invalidateCount());
    }
    return ok(undefined);
  }
}

type Equipment = "minecraft:crafting_table" | "minecraft:diamond_pickaxe";
