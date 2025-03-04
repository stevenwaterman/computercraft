import { MovingBot } from "../bots/MovingBot";
import * as event from "../event";

export default function forester() {
  const bot = new MovingBot();

  while (true) {
    bot.moveOnce({ direction: "up" }).assert();
    os.sleep(0.2);
  }

  // while (true) {
  //   const wood = bot.worldModel.find("minecraft:oak_log");
  //
  // bot.ensureHeading().assert();
  // bot.goTo(new Vector(-8, -63, 10));
  // bot.goTo(new Vector(-8, -63, 10));
}
