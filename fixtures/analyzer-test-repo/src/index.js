import { add, multiply } from "./math.js";
import { greet } from "./greet.js";

function main() {
  console.log(greet("world"));
  console.log("2 + 3 =", add(2, 3));
  console.log("2 * 3 =", multiply(2, 3));
}

main();
