import { MovingBot } from "../bots/MovingBot";
import * as event from "../event";

export default function botuber() {
  const bot = new MovingBot();

  while (true) {
    const result = bot.moveOnce({ direction: "up" });
    if (!result.ok) {
      break;
    }
  }

  while (true) {
    bot.moveOnce({ direction: "down" }).assert();
    bot.moveOnce({ direction: "down" }).assert();
    bot.place({ face: "up", item: "minecraft:smooth_stone_slab" }).assert();
  }
}
