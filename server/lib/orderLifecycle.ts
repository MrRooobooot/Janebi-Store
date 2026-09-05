import { eq, sql } from "drizzle-orm";
import { orderItems, products, users } from "../db/schema";

type AnyTx = any; // portable tx handle across SQLite/PostgreSQL dialects

/**
 * Restock every item of an order and refund the VIP points the user spent
 * at checkout. Shared by user-cancel, admin-cancel and failed-payment
 * paths — the status transition itself stays at each call site because
 * the statusText and clawback rules differ by flow.
 */
export async function restockItemsAndRefundPoints(tx: AnyTx, orderId: string, userId?: string | null, vipPointsUsed?: number | null) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await tx.update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${item.qty}` })
      .where(eq(products.id, item.productId));
  }
  const pointsUsed = Number(vipPointsUsed) || 0;
  if (pointsUsed > 0 && userId) {
    await tx.update(users)
      .set({ vipPoints: sql`${users.vipPoints} + ${pointsUsed}` })
      .where(eq(users.id, userId));
  }
}
