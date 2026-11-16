import type {
  KitchenStatus,
  PartyRoom,
  RestaurantState,
  RestaurantTicket,
} from '../types/tamsang.ts';
import { aggregateKitchenOrders } from './aggregator.ts';

export function getTicketFoodSubtotal(ticket: RestaurantTicket): number {
  return ticket.items.reduce(
    (sum, item) => sum + item.unitPrice * Math.max(1, item.quantity),
    0,
  );
}

export function getTicketBoxCount(ticket: RestaurantTicket): number {
  return ticket.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
}

export function getTicketNetTotal(ticket: RestaurantTicket): number {
  const food = getTicketFoodSubtotal(ticket);
  return Math.max(0, food + ticket.deliveryFee - ticket.discountAmount);
}

export function ticketToPartyRoom(
  ticket: RestaurantTicket,
  state: Pick<RestaurantState, 'shopName' | 'hostName' | 'promptPayId'>,
): PartyRoom {
  return {
    id: ticket.id,
    roomCode: ticket.queueNumber,
    title: `${ticket.tableNumber} (${ticket.queueNumber})`,
    shopName: state.shopName,
    hostName: state.hostName,
    promptPayId: state.promptPayId,
    status: 'open',
    deliveryFee: ticket.deliveryFee,
    discountAmount: ticket.discountAmount,
    splitMode: 'equal_delivery',
    orders: ticket.items,
    paidMembers: ticket.paidMembers,
  };
}

export function getNextKitchenStatus(current: KitchenStatus): KitchenStatus | null {
  switch (current) {
    case 'queued':
      return 'cooking';
    case 'cooking':
      return 'ready';
    case 'ready':
      return 'served';
    case 'served':
      return null;
  }
}

export function getRestaurantStats(tickets: RestaurantTicket[]) {
  const unpaidTickets = tickets.filter((t) => t.paymentStatus === 'unpaid');
  const activeKitchenTickets = tickets.filter(
    (t) => t.kitchenStatus === 'queued' || t.kitchenStatus === 'cooking',
  );
  const readyTickets = tickets.filter((t) => t.kitchenStatus === 'ready');

  const activeKitchenItems = activeKitchenTickets.flatMap((t) => t.items);
  const activeKitchenSummary = aggregateKitchenOrders(activeKitchenItems);

  const totalRevenueToday = tickets.reduce(
    (sum, t) => sum + getTicketNetTotal(t),
    0,
  );
  const paidRevenueToday = tickets
    .filter((t) => t.paymentStatus === 'paid')
    .reduce((sum, t) => sum + getTicketNetTotal(t), 0);

  return {
    unpaidCount: unpaidTickets.length,
    activeKitchenCount: activeKitchenTickets.length,
    activeKitchenBoxes: activeKitchenSummary.totalBoxes,
    activeKitchenSummary,
    readyCount: readyTickets.length,
    totalRevenueToday,
    paidRevenueToday,
  };
}

export function generateKitchenTicketsText(state: RestaurantState): string {
  const active = state.tickets.filter(
    (t) => t.kitchenStatus === 'queued' || t.kitchenStatus === 'cooking',
  );
  if (active.length === 0) {
    return `🍳 ไม่มีคิวค้างในครัว (${state.shopName})`;
  }

  const summary = aggregateKitchenOrders(active.flatMap((t) => t.items));
  const lines: string[] = [
    `🍳 สรุปออเดอร์กำลังรอผัด — ${state.shopName}`,
    `────────────────────────`,
    `📋 รวบเมนูผัดพร้อมกัน:`,
  ];

  summary.dishes.forEach((d, idx) => {
    lines.push(`${idx + 1}. ${d.fullName} — x${d.totalQuantity}`);
  });

  if (summary.addonSummary.length > 0) {
    lines.push(
      `🥚 รวมไข่/ท็อปปิ้ง: ${summary.addonSummary
        .map((a) => `${a.name} x${a.count}`)
        .join(' | ')}`,
    );
  }

  lines.push(`────────────────────────`);
  lines.push(`🧾 แยกตามคิวโต๊ะ (${active.length} คิว / ${summary.totalBoxes} จาน):`);
  active.forEach((t) => {
    lines.push(`• ${t.queueNumber} [${t.tableNumber}] — ${getTicketBoxCount(t)} จาน`);
  });

  return lines.join('\n');
}
