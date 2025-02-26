import * as event from "../event";
import { a_drop, a_transfer, slot_name } from "../utils";

const slots = [1, 2, 3, 5, 6, 7, 9, 10, 11, 4, 8, 12, 13, 14, 15, 16];

const piglinSide = "U";
const storageSide = "F";
const trashSide = "D";

type InventoryMovement = {
  fromIdx: number;
  toIdx: number;
  amount: number;
};

function murderise() {
  turtle.select(1);
  while (true) {
    while (turtle.suckUp()[0]) {}

    turtle.attackUp();

    if (turtle.getItemCount(16) > 0) {
      return;
    }
  }
}

function sortNonNuggets() {
  for (const slot of slots) {
    const item = slot_name(slot);
    if (item === "minecraft:gold_nugget") {
      continue;
    } else if (item === "minecraft:golden_sword") {
      a_drop(trashSide, slot);
      continue;
    } else if (item === "minecraft:rotten_flesh") {
      a_drop(trashSide, slot);
      continue;
    } else {
      a_drop(storageSide, slot);
    }
  }
}

function craftNuggets() {
  const nuggetsPerSlot: number[] = slots.map(
    (slot) => turtle.getItemCount(slot)!
  );
  const totalNuggets = nuggetsPerSlot.reduce((acc, elem) => acc + elem, 0);

  if (totalNuggets > 64 * 9) {
    throw "too many nuggets, fixme";
  }

  if (totalNuggets < 9) {
    throw "not enough nuggets, fixme";
  }

  const lowSlotAmount = Math.floor(totalNuggets / 9);
  const highSlotAmount = lowSlotAmount + 1;
  const highSlotCount = totalNuggets - lowSlotAmount * 9;

  const targetPerSlot: number[] = slots.map((slot, idx) => {
    if (idx < highSlotCount) {
      return highSlotAmount;
    } else if (idx < 9) {
      return lowSlotAmount;
    } else {
      return 0;
    }
  });

  function getNextMove(): InventoryMovement | null {
    const fromIdx = nuggetsPerSlot.findIndex(
      (current, idx) => current > targetPerSlot[idx]
    );
    if (fromIdx === -1) {
      return null;
    }

    const toIdx = nuggetsPerSlot.findIndex(
      (current, idx) => current < targetPerSlot[idx]
    );

    const fromAmount = nuggetsPerSlot[fromIdx] - targetPerSlot[fromIdx];
    const toAmount = targetPerSlot[toIdx] - nuggetsPerSlot[toIdx];
    const transferAmount = Math.min(fromAmount, toAmount);

    return {
      fromIdx: fromIdx,
      toIdx: toIdx,
      amount: transferAmount,
    };
  }

  while (true) {
    const nextMove = getNextMove();
    if (nextMove === null) {
      break;
    }

    nuggetsPerSlot[nextMove.fromIdx] -= nextMove.amount;
    nuggetsPerSlot[nextMove.toIdx] += nextMove.amount;

    const fromSlot = slots[nextMove.fromIdx];
    const toSlot = slots[nextMove.toIdx];
    a_transfer(fromSlot, toSlot, nextMove.amount);
  }

  turtle.select(4);
  turtle.craft(lowSlotAmount);
  a_drop(storageSide, 4);

  for (let idx = 1; idx < highSlotCount; idx++) {
    const slot = slots[idx];
    a_transfer(slot, slots[0]);
  }
}

export default function sorty() {
  while (true) {
    murderise();
    sortNonNuggets();
    craftNuggets();
  }
}
