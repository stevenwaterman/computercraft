import { MovingBot } from "../bots/MovingBot";
import * as event from "../event";

export default function forester() {
  const bot = new MovingBot();

  // while (true) {
  //   const wood = bot.worldModel.find("minecraft:oak_log");
  // }
  bot.ensureHeading().assert();
  bot.goTo(new Vector(19, -63, 9));
  // bot.goTo(new Vector(-8, -63, 10));
}
