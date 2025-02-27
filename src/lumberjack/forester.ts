import { MovingBot } from "../bots/MovingBot";
import * as event from "../event";

export default function forester() {
  const bot = new MovingBot();

  bot.ensureHeading().assert();

  bot.moveMany("+Z", ["+Y", 3], ["+Z", 2]);
}
