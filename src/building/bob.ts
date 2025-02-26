import * as event from "../event";
import { a_move, a_place } from "../utils";

const backwards = 64;
const right = 64;

let placeCount = 0;
let slot = 1;

export default function build() {
  for (let x = 0; x < right; x++) {
    for (let z = 0; z < backwards; z++) {
      a_place("D", slot);
      placeCount++;

      if (placeCount === 64) {
        placeCount = 0;
        slot++;

        if (slot === 16) {
          slot = 0;

          while (turtle.getItemCount(15) === 0) {
            print("refill me");
          }
        }
      }

      // if (x % 6 === 5 && z % 6 === 1) {
      //   a_place("F", 16);
      // }

      a_move("B");
    }

    if (x % 2 === 0) {
      turtle.turnRight();
      a_move("B");
      turtle.turnRight();
      a_move("B");
    } else {
      turtle.turnLeft();
      a_move("B");
      turtle.turnLeft();
      a_move("B");
    }
  }
}
