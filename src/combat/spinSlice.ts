import * as event from "../event";

export default function slicer() {
  while (true) {
    turtle.suck();
    turtle.attack();
    turtle.turnRight();
  }
}
