import * as event from "../event";
import { digBlock } from "../utils";

function putInChest() {
  while (!turtle.dropDown()[0]);
}

export default function digForever() {
  while (true) {
    digBlock("minecraft:cobblestone");
    putInChest();
  }
}
