import { ADDON_OPTIONS } from '../data/presets.ts';
import type {
  AddonSummaryItem,
  AggregatedDish,
  KitchenSummary,
  OrderItem,
  PartyRoom,
} from '../types/tamsang.ts';
import { formatDishFullName, getDishParts, getDishSignature } from './pricing.ts';

export function aggregateKitchenOrders(orders: OrderItem[]): KitchenSummary {
  const dishMap = new Map<string, AggregatedDish>();
  const addonCounts = new Map<string, number>();

  let totalBoxes = 0;
  let totalFoodAmount = 0;

  for (const order of orders) {
    const qty = Math.max(1, order.quantity);
    const sig = getDishSignature(order.config);
    const parts = getDishParts(order.config);
    const fullName = formatDishFullName(order.config);

    totalBoxes += qty;
    totalFoodAmount += order.unitPrice * qty;

    for (const addonId of order.config.addonIds) {
      addonCounts.set(addonId, (addonCounts.get(addonId) ?? 0) + qty);
    }

    const existing = dishMap.get(sig);
    if (existing) {
      existing.totalQuantity += qty;
      existing.totalAmount += order.unitPrice * qty;
      const memberEntry = existing.orderedBy.find(
        (m) => m.memberName === order.memberName,
      );
      if (memberEntry) {
        memberEntry.quantity += qty;
      } else {
        existing.orderedBy.push({ memberName: order.memberName, quantity: qty });
      }
    } else {
      dishMap.set(sig, {
        signature: sig,
        fullName,
        baseName: `${parts.baseName}${parts.meatName}`,
        formatLabel: parts.formatLabel,
        portionLabel: parts.portionLabel,
        spiceLabel: parts.spiceLabel,
        spiceLevel: order.config.spice,
        addonNames: parts.addonNames,
        veggieNotes: [...order.config.veggieNotes],
        customNote: order.config.customNote.trim(),
        unitPrice: order.unitPrice,
        totalQuantity: qty,
        totalAmount: order.unitPrice * qty,
        orderedBy: [{ memberName: order.memberName, quantity: qty }],
      });
    }
  }

  const dishes = Array.from(dishMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity,
  );

  const addonSummary: AddonSummaryItem[] = ADDON_OPTIONS.map((opt) => ({
    id: opt.id,
    name: opt.name,
    count: addonCounts.get(opt.id) ?? 0,
  })).filter((item) => item.count > 0);

  return {
    dishes,
    totalBoxes,
    totalFoodAmount,
    addonSummary,
  };
}

export function generateLineOrderText(room: PartyRoom): string {
  const summary = aggregateKitchenOrders(room.orders);
  if (summary.dishes.length === 0) {
    return `ยังไม่มีรายการอาหารในตี้ "${room.title}"`;
  }

  const lines: string[] = [
    `🍳 ออเดอร์ตี้ตามสั่ง: ${room.shopName}`,
    `📌 ห้อง: ${room.title} (${room.roomCode}) | หัวตี้: ${room.hostName}`,
    `────────────────────────`,
    `📋 รายการส่งแม่ค้า (รวบเมนูซ้ำแล้ว):`,
  ];

  summary.dishes.forEach((dish, idx) => {
    const people = dish.orderedBy
      .map((p) => (p.quantity > 1 ? `${p.memberName} x${p.quantity}` : p.memberName))
      .join(', ');
    lines.push(
      `${idx + 1}. ${dish.fullName} — x${dish.totalQuantity} (${dish.totalAmount.toLocaleString('th-TH')}฿)`,
    );
    lines.push(`   ↳ ของ: ${people}`);
  });

  if (summary.addonSummary.length > 0) {
    lines.push(`────────────────────────`);
    lines.push(
      `🍳 สรุปท็อปปิ้ง/ไข่: ${summary.addonSummary
        .map((a) => `${a.name} x${a.count}`)
        .join(' | ')}`,
    );
  }

  const netTotal = Math.max(
    0,
    summary.totalFoodAmount + room.deliveryFee - room.discountAmount,
  );

  lines.push(`────────────────────────`);
  lines.push(`📦 รวมทั้งหมด: ${summary.totalBoxes} กล่อง`);
  lines.push(`💵 ค่าอาหารรวม: ${summary.totalFoodAmount.toLocaleString('th-TH')} บาท`);
  if (room.deliveryFee > 0) {
    lines.push(`🛵 ค่าส่ง: +${room.deliveryFee.toLocaleString('th-TH')} บาท`);
  }
  if (room.discountAmount > 0) {
    lines.push(`🏷️ ส่วนลด: -${room.discountAmount.toLocaleString('th-TH')} บาท`);
  }
  lines.push(`💰 ยอดสุทธิทั้งตี้: ${netTotal.toLocaleString('th-TH')} บาท`);

  return lines.join('\n');
}
