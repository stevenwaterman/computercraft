import * as event from "../event";

const seedSlot = 1;
const bonemealSlot = 2;
const outWheatSlot = 3;
const outSeedSlot = 4;

function growAndHarvestOnce() {
  plant();
  growUntilFull();
  turtle.dig();
}

function plant() {
  turtle.select(seedSlot);
  turtle.place();
}

function growUntilFull() {
  turtle.select(bonemealSlot);
  while (turtle.place()[0]);
}

function resetInventory() {
  refillBonemeal();
  emptyInvent();
}

function refillBonemeal() {
  turtle.select(bonemealSlot);
  if (turtle.getItemCount() > 16) return;

  while (true) {
    const bonemealSpace = turtle.getItemSpace();
    const [success, _] = turtle.suckUp(bonemealSpace);
    if (success) return;
  }
}

function emptyInvent() {
  if (turtle.getItemCount(outWheatSlot) > 56) {
    turtle.select(outWheatSlot);
    while (!turtle.dropDown()[0]);
  }

  if (turtle.getItemCount(seedSlot) < 8) {
    const requestedSeeds = turtle.getItemSpace(seedSlot);
    const availableSeeds = turtle.getItemCount(outSeedSlot);
    const transferSeeds = Math.min(requestedSeeds, availableSeeds);
    turtle.select(outSeedSlot);
    turtle.transferTo(seedSlot, transferSeeds);
  }

  if (turtle.getItemCount(outSeedSlot) > 56) {
    turtle.select(outSeedSlot);
    while (!turtle.dropDown()[0]);
  }
}

export default function harvestForever() {
  while (true) {
    resetInventory();
    growAndHarvestOnce();
  }
}
