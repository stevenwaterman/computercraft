import * as event from "./event";
import boner from "./farming/boner";
import cobblebot from "./digging/cobblebot";
import jack from "./lumberjack/jack";
import bob from "./building/bob";
import sorty from "./goldFarm/sorty";
import slicer from "./combat/slicer";
import spinSlice from "./combat/spinSlice";
import forester from "./lumberjack/forester";

import { MovingBot } from "./bots/MovingBot";

const actions: Record<string, () => void> = {
  cobblebot,
  boner,
  jack,
  bob,
  sorty,
  slicer,
  spinSlice,
  forester,
};

const label = os.getComputerLabel();

if (label && label in actions) {
  const action = actions[label];
  action();
} else {
  print("bad label");
}
