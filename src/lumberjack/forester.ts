import * as event from "../event";
import { Inventory, InventoryImpl } from "../bots/inventory/Inventory";

export default function forester() {
  const inventory: InventoryImpl = new InventoryImpl();
  // inventory.drop({
  //   amount: {
  //     "minecraft:cobblestone_slab": 70,
  //   },
  // });

  inventory.ensureEquipped("minecraft:diamond_pickaxe").assert();
}
