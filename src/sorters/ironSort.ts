import { pretty_print } from "cc.pretty";
import { MovingBot } from "../bots/MovingBot";
import { ItemName } from "../bots/types";
import * as event from "../event";

const ironIngot: ItemName = "minecraft:iron_ingot";

class IronSortingBot extends MovingBot {
  sortOnce() {
    while ((this.items[ironIngot] ?? 0) < 8 * 64) {
      const result = this.suck({ face: "up" });
      if (!result.ok && result.error !== "No items to take") {
        break;
      }
    }

    // Throw poppies in the void
    this.drop({
      face: "down",
      amount: {
        "minecraft:poppy": "all",
      },
    }).assert();

    // Store everything that isn't iron ingots
    const weirdItems = { ...this.items };
    delete weirdItems[ironIngot];
    this.drop({
      face: "front",
      amount: weirdItems,
    }).assert();

    // Craft iron blocks
    this.craft({
      recipe: {
        topLeft: ironIngot,
        topMiddle: ironIngot,
        topRight: ironIngot,
        middleLeft: ironIngot,
        middleMiddle: ironIngot,
        middleRight: ironIngot,
        bottomLeft: ironIngot,
        bottomMiddle: ironIngot,
        bottomRight: ironIngot,
      },
    }).assert();

    this.drop({
      face: "front",
      amount: {
        "minecraft:iron_block": "all",
      },
    }).assert();
  }
}

export default function ironSort() {
  const bot = new IronSortingBot();

  while (true) {
    bot.sortOnce();
  }
}
