import type { BillSplitReport, MemberBillSplit, PartyRoom } from '../types/tamsang.ts';
import { formatDishFullName } from './pricing.ts';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Allocates an exact total across weights in satang (0.01 THB) using the
 * largest-remainder method so individual shares always sum exactly to total.
 */
function allocateSatang(totalAmount: number, weights: number[]): number[] {
  const count = weights.length;
  if (count === 0 || totalAmount <= 0) {
    return new Array<number>(count).fill(0);
  }

  const totalSatang = Math.round(totalAmount * 100);
  const weightSum = weights.reduce((acc, w) => acc + Math.max(0, w), 0);

  const rawShares = weights.map((w) =>
    weightSum > 0
      ? (Math.max(0, w) / weightSum) * totalSatang
      : totalSatang / count,
  );

  const floors = rawShares.map((s) => Math.floor(s));
  let remainder = totalSatang - floors.reduce((acc, v) => acc + v, 0);

  const indicesByFraction = rawShares
    .map((s, idx) => ({ idx, frac: s - floors[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i += 1) {
    const target = indicesByFraction[i % indicesByFraction.length];
    floors[target.idx] += 1;
  }

  return floors.map((satang) => satang / 100);
}

export function calculateMemberSplits(room: PartyRoom): BillSplitReport {
  const memberMap = new Map<
    string,
    {
      memberName: string;
      department: string;
      itemCount: number;
      itemsSummary: Array<{ id: string; fullName: string; quantity: number; lineTotal: number }>;
      foodSubtotal: number;
    }
  >();

  let totalFood = 0;

  for (const order of room.orders) {
    const qty = Math.max(1, order.quantity);
    const lineTotal = order.unitPrice * qty;
    totalFood += lineTotal;

    const existing = memberMap.get(order.memberName);
    const summaryItem = {
      id: order.id,
      fullName: formatDishFullName(order.config),
      quantity: qty,
      lineTotal,
    };

    if (existing) {
      existing.itemCount += qty;
      existing.foodSubtotal += lineTotal;
      existing.itemsSummary.push(summaryItem);
    } else {
      memberMap.set(order.memberName, {
        memberName: order.memberName,
        department: order.department || 'ทีมงาน',
        itemCount: qty,
        itemsSummary: [summaryItem],
        foodSubtotal: lineTotal,
      });
    }
  }

  const activeMembers = Array.from(memberMap.values());
  const memberCount = activeMembers.length;
  const deliveryFee = Math.max(0, room.deliveryFee);
  const discountAmount = Math.max(0, room.discountAmount);
  const paidSet = new Set(room.paidMembers);

  const deliveryWeights =
    room.splitMode === 'equal_delivery'
      ? activeMembers.map(() => 1)
      : activeMembers.map((m) => (totalFood > 0 ? m.foodSubtotal : 1));

  const discountWeights = activeMembers.map((m) =>
    totalFood > 0 ? m.foodSubtotal : 1,
  );

  const deliveryShares = allocateSatang(deliveryFee, deliveryWeights);
  const discountShares = allocateSatang(discountAmount, discountWeights);

  const members: MemberBillSplit[] = activeMembers.map((m, idx) => {
    const roundedDelivery = deliveryShares[idx] ?? 0;
    const roundedDiscount = discountShares[idx] ?? 0;
    const rawNet = Math.max(0, m.foodSubtotal + roundedDelivery - roundedDiscount);
    const netPayable = round2(rawNet);

    return {
      memberName: m.memberName,
      department: m.department,
      itemCount: m.itemCount,
      itemsSummary: m.itemsSummary,
      foodSubtotal: round2(m.foodSubtotal),
      deliveryShare: roundedDelivery,
      discountShare: roundedDiscount,
      netPayable,
      netPayableRounded: Math.round(netPayable),
      isPaid: paidSet.has(m.memberName),
    };
  });

  const totalNet = round2(members.reduce((sum, m) => sum + m.netPayable, 0));
  const totalCollected = round2(
    members.filter((m) => m.isPaid).reduce((sum, m) => sum + m.netPayable, 0),
  );
  const totalPending = round2(Math.max(0, totalNet - totalCollected));
  const paidCount = members.filter((m) => m.isPaid).length;

  return {
    members,
    totalFood: round2(totalFood),
    totalDelivery: round2(deliveryFee),
    totalDiscount: round2(discountAmount),
    totalNet,
    totalCollected,
    totalPending,
    paidCount,
    memberCount,
  };
}
