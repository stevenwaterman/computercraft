import { MovingBot } from "../bots/MovingBot";
import * as event from "../event";

export default function forester() {
  const bot = new MovingBot();

  bot.moveOnce();
  const heading = bot.heading.assert();
  print(heading)
}
