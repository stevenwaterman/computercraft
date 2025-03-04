import { pretty, pretty_print } from "cc.pretty";
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

const placeFunc = {
  front: turtle.place,
  up: turtle.placeUp,
  down: turtle.placeDown,
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

  public place({ face = "front" }: { face?: Face }): Result<void> {
    this.select();
    const [success, reason] = placeFunc[face]();
    this.count--;

    if (!success) {
      return err(reason!);
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

    // TODO lava bucket
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
    if (amount === 0) {
      return ok(0);
    }

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

  place({
    face = "front",
    item,
  }: {
    face?: Face;
    item: ItemName;
  }): Result<void>;
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

    this.slots.forEach((slot) => slot.invalidate());
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
    amount?: Record<ItemName, number | "all"> | "all";
  } = {}): Result<void> {
    if (amount === "all") {
      this.slots.forEach((slot) => slot.drop({ face }).assert());
      return ok(undefined);
    }

    const remaining: Record<ItemName, number | "all"> = { ...amount };
    const toDrop: Array<[InventorySlot, number]> = [];

    for (const slot of this.slots) {
      if (slot.name !== null) {
        const maxDrop = remaining[slot.name] ?? 0;
        const dropAmount =
          maxDrop === "all" ? slot.count : Math.min(slot.count, maxDrop);

        if (dropAmount > 0) {
          toDrop.push([slot, dropAmount]);

          const oldRemaining = remaining[slot.name];
          if (oldRemaining !== "all") {
            remaining[slot.name] = oldRemaining - dropAmount;
          }

          if (remaining[slot.name] === 0) {
            delete remaining[slot.name];
          }
        }
      }
    }

    const notEnoughItems = Object.values(remaining).some(
      (count) => count !== "all"
    );
    if (notEnoughItems) {
      return err("Not enough items");
    }

    toDrop.forEach(([slot, amount]) => {
      slot.drop({ face, amount }).assert();
    });

    return ok(undefined);
  }

  place({
    face = "front",
    item,
  }: {
    face?: Face;
    item: ItemName;
  }): Result<void> {
    const slot = this.slots.find((slot) => slot.name === item);

    if (slot === undefined) {
      return err("Item not found");
    }

    return slot.place({ face });
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

  public craft({
    recipe,
    amount = "all",
  }: {
    recipe: CraftingRecipe;
    amount?: number | "all";
  }): Result<number> {
    this.ensureEquipped("minecraft:crafting_table");

    const recipeItems: ItemName[] = Object.values(recipe);
    const recipeRatio: Record<ItemName, number> = {};
    for (const item of recipeItems) {
      const currentAmount = recipeRatio[item] ?? 0;
      recipeRatio[item] = currentAmount + 1;
    }

    const inventoryItems: Record<ItemName, number> = this.items;

    for (const item of Object.keys(inventoryItems) as ItemName[]) {
      // Every item in the inventory is used
      if (recipeRatio[item] === undefined) {
        return err("Extra item in inventory");
      }
    }

    for (const item of recipeItems) {
      // Inventory has all required items
      if (inventoryItems[item] === undefined) {
        return err("Missing ingredient");
      }
    }

    // We know the inventory has all ingredients and nothing else

    const maxStackSizes: Record<ItemName, number> = {};
    this.slots
      .filter((slot) => !slot.empty)
      .forEach((slot) => (maxStackSizes[slot.name!] = slot.maxStackSize!));

    for (const item of Object.keys(inventoryItems) as ItemName[]) {
      const ratio = recipeRatio[item];
      const itemCount = inventoryItems[item];

      if (
        (amount === "all" && itemCount < ratio) ||
        (amount !== "all" && itemCount < ratio * amount)
      ) {
        return err("Not enough ingredients");
      }

      const stacks = itemCount / maxStackSizes[item];
      if (stacks > ratio) {
        return err("Too much stuff");
      }
    }

    // If all 16 slots are full, defragment so there's an empty space to work with
    if (this.slots.every((slot) => !slot.empty)) {
      this.defragment();
    }

    const target: Array<[SlotIdx, ItemName | "X", number]> = [];
    for (const recipeSlot of recipeSlots) {
      const item = recipe[recipeSlot];
      const slotIdx = recipeSlotsMapping[recipeSlot];
      if (item === undefined) {
        target.push([slotIdx, "X", 0]);
      } else {
        const inventoryAmount = inventoryItems[item];
        const ratio = recipeRatio[item];

        // 10 items in 3 slots, modulo is 1
        // 1 slot should be rounded up, the rest should be rounded down
        const extraAmount = inventoryAmount % ratio;
        const itemIdx = target.filter((t) => t[1] === item).length;
        const shouldRoundUp = itemIdx < extraAmount;

        const amount = inventoryAmount / ratio;
        const roundedAmount = shouldRoundUp
          ? Math.ceil(amount)
          : Math.floor(amount);
        target.push([slotIdx, item, roundedAmount]);
      }
    }

    // Sort with empty slots last
    target.sort((a, b) => b[2] - a[2]);

    const frozenSlots: Set<InventorySlot> = new Set();
    for (const [slotIdx, targetItem, targetAmount] of target) {
      const slot = this.slots[slotIdx];
      frozenSlots.add(slot);

      // If the slot has the wrong thing in
      if (!slot.empty && (targetItem === "X" || slot.name !== targetItem)) {
        // List of other slots containing the same item, sorted from most space - least space
        const otherSlots = this.slots
          .filter(
            (other) => !frozenSlots.has(other) && other.name === targetItem
          )
          .toSorted((a, b) => b.space! - a.space!);

        // For each of those destination slots, try and empty it out
        for (const other of otherSlots) {
          slot.transferTo({ target: other }).assert();
          if (slot.empty) {
            break;
          }
        }

        // If there's still too much, put the excess in an empty slot
        const emptySlot = this.slots.find(
          (other) => !frozenSlots.has(other) && other.empty
        );
        if (emptySlot === undefined) {
          return err("No empty slots");
        }
        slot.transferTo({ target: emptySlot }).assert();
      }

      // If the slot has the right thing but too much
      if (slot.count > targetAmount) {
        // List slots we can take from, sorted from most - least space
        const otherSlots = this.slots
          .filter(
            (other) => !frozenSlots.has(other) && other.name === targetItem
          )
          .toSorted((a, b) => b.space! - a.space!);

        // For each of those destination slots, try and empty it out
        for (const other of otherSlots) {
          const amountToShed = slot.count - targetAmount;
          const space = other.space!;
          const transferAmount = Math.min(amountToShed, space);
          slot.transferTo({ target: other, amount: transferAmount }).assert();
          if (slot.empty) {
            break;
          }
        }

        // If there's still too much, put the excess in an empty slot
        const emptySlot = this.slots.find(
          (other) => !frozenSlots.has(other) && other.empty
        );
        if (emptySlot === undefined) {
          return err("No empty slots");
        }
        slot.transferTo({ target: emptySlot }).assert();
      }

      // If the slot needs more
      if (slot.count < targetAmount) {
        // List of other slots containing the same item, sorted from most - least amount
        const otherSlots = this.slots
          .filter(
            (other) => !frozenSlots.has(other) && other.name === targetItem
          )
          .toSorted((a, b) => b.count - a.count);

        for (const other of otherSlots) {
          const amountRequired = targetAmount - slot.count;
          const amountAvailable = other.count;
          const transferAmount = Math.min(amountRequired, amountAvailable);

          other.transferTo({ target: slot, amount: transferAmount }).assert();
          if (slot.count === targetAmount) {
            break;
          }
        }

        if (slot.count !== targetAmount) {
          return err("Couldn't fill slot for some reason");
        }
      }
    }

    const craftAmount =
      amount === "all"
        ? Math.min(
            ...this.slots.map((slot) => slot.count).filter((count) => count > 0)
          )
        : amount;
    const [success, reason] = turtle.craft(craftAmount);
    if (!success) {
      return err(reason);
    }

    this.slots.forEach((slot) => {
      if (slot.count > craftAmount) {
        slot.invalidateCount();
      } else {
        slot.invalidate();
      }
    });

    return ok(craftAmount);
  }
}

const recipeSlotsMapping: Record<RecipeSlot, SlotIdx> = {
  topLeft: 0,
  topMiddle: 1,
  topRight: 2,
  middleLeft: 4,
  middleMiddle: 5,
  middleRight: 6,
  bottomLeft: 8,
  bottomMiddle: 9,
  bottomRight: 10,
};

type RecipeSlot = keyof CraftingRecipe;
const recipeSlots: RecipeSlot[] = [
  "topLeft",
  "topMiddle",
  "topRight",
  "middleLeft",
  "middleMiddle",
  "middleRight",
  "bottomLeft",
  "bottomMiddle",
  "bottomRight",
];
type CraftingRecipe = {
  topLeft?: ItemName;
  topMiddle?: ItemName;
  topRight?: ItemName;
  middleLeft?: ItemName;
  middleMiddle?: ItemName;
  middleRight?: ItemName;
  bottomLeft?: ItemName;
  bottomMiddle?: ItemName;
  bottomRight?: ItemName;
};

type Equipment = "minecraft:crafting_table" | "minecraft:diamond_pickaxe";
