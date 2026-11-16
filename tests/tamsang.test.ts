import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PARTY_ROOM, INITIAL_RESTAURANT_STATE } from '../src/data/presets.ts';
import type { CustomDishConfig, OrderItem, PartyRoom } from '../src/types/tamsang.ts';
import {
  aggregateKitchenOrders,
  generateLineOrderText,
} from '../src/utils/aggregator.ts';
import { calculateMemberSplits } from '../src/utils/billSplitter.ts';
import {
  calculateDishUnitPrice,
  formatDishFullName,
  getDishSignature,
} from '../src/utils/pricing.ts';
import {
  crc16CcittFalse,
  generatePromptPayPayload,
  isValidPromptPayId,
} from '../src/utils/promptpay.ts';
import {
  getNextKitchenStatus,
  getRestaurantStats,
  getTicketNetTotal,
  ticketToPartyRoom,
} from '../src/utils/restaurant.ts';

test('calculateDishUnitPrice sums base, meat, format, portion, and addons accurately', () => {
  const config: CustomDishConfig = {
    format: 'rice', // +0
    baseId: 'kaprao', // 50
    meatId: 'crispy_pork', // +15
    spice: 'hot',
    portion: 'special', // +10
    addonIds: ['egg_runny', 'moo_yor'], // +10 + 15
    veggieNotes: ['ไม่ใส่ถั่วฝักยาว'],
    customNote: '',
  };

  assert.equal(calculateDishUnitPrice(config), 100);

  const noodleSide: CustomDishConfig = {
    format: 'side', // +25
    baseId: 'tom_yum', // 60
    meatId: 'seafood', // +25
    spice: 'fire',
    portion: 'jumbo', // +20
    addonIds: [],
    veggieNotes: [],
    customNote: '',
  };
  assert.equal(calculateDishUnitPrice(noodleSide), 130);
});

test('getDishSignature normalizes addon/note ordering and whitespace', () => {
  const a: CustomDishConfig = {
    format: 'rice',
    baseId: 'kaprao',
    meatId: 'crispy_pork',
    spice: 'hot',
    portion: 'special',
    addonIds: ['egg_runny', 'chinese_sausage'],
    veggieNotes: ['ไม่ใส่ถั่วฝักยาว', 'ข้าวน้อย'],
    customNote: '  แยกพริก  ',
  };
  const b: CustomDishConfig = {
    format: 'rice',
    baseId: 'kaprao',
    meatId: 'crispy_pork',
    spice: 'hot',
    portion: 'special',
    addonIds: ['chinese_sausage', 'egg_runny'],
    veggieNotes: ['ข้าวน้อย', 'ไม่ใส่ถั่วฝักยาว'],
    customNote: 'แยกพริก',
  };

  assert.equal(getDishSignature(a), getDishSignature(b));
  assert.match(formatDishFullName(a), /กะเพราหมูกรอบ/);
  assert.match(formatDishFullName(a), /ไข่ดาวไม่สุก/);
});

test('aggregateKitchenOrders consolidates identical dishes and sums eggs', () => {
  const summary = aggregateKitchenOrders(INITIAL_PARTY_ROOM.orders);

  // INITIAL_PARTY_ROOM has 5 orders where ord-01 (คุณไลท์) and ord-02 (คุณต้น) are identical
  assert.equal(summary.totalBoxes, 5);
  assert.equal(summary.dishes.length, 4);
  assert.equal(summary.totalFoodAmount, 85 + 85 + 65 + 60 + 100);

  const topDish = summary.dishes[0];
  assert.equal(topDish.totalQuantity, 2);
  assert.equal(topDish.orderedBy.length, 2);

  const runnyEggs = summary.addonSummary.find((a) => a.id === 'egg_runny');
  const omelets = summary.addonSummary.find((a) => a.id === 'omelet');
  assert.equal(runnyEggs?.count, 3);
  assert.equal(omelets?.count, 2);

  const lineText = generateLineOrderText(INITIAL_PARTY_ROOM);
  assert.match(lineText, /รวมทั้งหมด: 5 กล่อง/);
  assert.match(lineText, /ไข่ดาวไม่สุก x3/);
});

test('calculateMemberSplits handles equal_delivery and proportional modes accurately', () => {
  const sampleOrders: OrderItem[] = [
    {
      id: '1',
      memberName: 'A',
      department: 'IT',
      config: {
        format: 'rice',
        baseId: 'kaprao',
        meatId: 'pork_mince',
        spice: 'medium',
        portion: 'regular',
        addonIds: [],
        veggieNotes: [],
        customNote: '',
      },
      quantity: 1,
      unitPrice: 100,
      createdAt: '2026-11-15T00:00:00.000Z',
    },
    {
      id: '2',
      memberName: 'B',
      department: 'Design',
      config: {
        format: 'rice',
        baseId: 'kaprao',
        meatId: 'seafood',
        spice: 'medium',
        portion: 'regular',
        addonIds: [],
        veggieNotes: [],
        customNote: '',
      },
      quantity: 1,
      unitPrice: 300,
      createdAt: '2026-11-15T00:00:00.000Z',
    },
  ];

  const equalRoom: PartyRoom = {
    ...INITIAL_PARTY_ROOM,
    orders: sampleOrders,
    deliveryFee: 40,
    discountAmount: 40,
    splitMode: 'equal_delivery',
    paidMembers: ['A'],
  };

  const equalReport = calculateMemberSplits(equalRoom);
  assert.equal(equalReport.totalFood, 400);
  // Equal delivery: 20 each. Proportional discount: A gets 10, B gets 30.
  assert.equal(equalReport.members[0].deliveryShare, 20);
  assert.equal(equalReport.members[0].discountShare, 10);
  assert.equal(equalReport.members[0].netPayable, 110);
  assert.equal(equalReport.members[1].deliveryShare, 20);
  assert.equal(equalReport.members[1].discountShare, 30);
  assert.equal(equalReport.members[1].netPayable, 290);
  assert.equal(equalReport.totalNet, 400);
  assert.equal(equalReport.totalCollected, 110);
  assert.equal(equalReport.totalPending, 290);

  const propRoom: PartyRoom = {
    ...equalRoom,
    splitMode: 'proportional',
  };
  const propReport = calculateMemberSplits(propRoom);
  // Proportional delivery: A gets 10, B gets 30. Discount: A gets 10, B gets 30.
  assert.equal(propReport.members[0].deliveryShare, 10);
  assert.equal(propReport.members[0].netPayable, 100);
  assert.equal(propReport.members[1].deliveryShare, 30);
  assert.equal(propReport.members[1].netPayable, 300);

  // Non-divisible satang allocation must reconcile exactly without 0.01 THB drift
  const defaultReport = calculateMemberSplits(INITIAL_PARTY_ROOM);
  assert.equal(defaultReport.totalFood, 395);
  assert.equal(defaultReport.totalNet, 405);
});

test('generatePromptPayPayload generates valid EMVCo QR payloads and CRC16 checksum', () => {
  assert.equal(isValidPromptPayId('081-234-5678'), true);
  assert.equal(isValidPromptPayId('1234567890123'), true);
  assert.equal(isValidPromptPayId('12345'), false);

  const payload = generatePromptPayPayload('081-234-5678', 85.5);
  assert.ok(
    payload.startsWith(
      '00020101021229370016A000000677010111011300668123456785303764540585.505802TH6304',
    ),
  );
  const bodyWithoutCrc = payload.slice(0, -4);
  const checksum = payload.slice(-4);
  assert.equal(checksum, crc16CcittFalse(bodyWithoutCrc));

  const nationalIdPayload = generatePromptPayPayload('1234567890123');
  assert.ok(nationalIdPayload.includes('02131234567890123'));
  assert.ok(nationalIdPayload.startsWith('000201010211')); // Static QR without amount

  assert.throws(() => generatePromptPayPayload('999'), /ไม่ถูกต้อง/);
});

test('restaurant ticket stats, status flow, and split bill conversion work accurately', () => {
  const stats = getRestaurantStats(INITIAL_RESTAURANT_STATE.tickets);
  // tkt-101 (170), tkt-102 (165), tkt-103 (90), tkt-104 (170 - 10 = 160)
  assert.equal(stats.unpaidCount, 3);
  assert.equal(stats.activeKitchenCount, 3);
  assert.equal(stats.activeKitchenBoxes, 5);
  assert.equal(stats.readyCount, 1);
  assert.equal(stats.totalRevenueToday, 585);
  assert.equal(stats.paidRevenueToday, 160);

  assert.equal(getNextKitchenStatus('queued'), 'cooking');
  assert.equal(getNextKitchenStatus('cooking'), 'ready');
  assert.equal(getNextKitchenStatus('ready'), 'served');
  assert.equal(getNextKitchenStatus('served'), null);

  const tkt101 = INITIAL_RESTAURANT_STATE.tickets[0];
  assert.equal(getTicketNetTotal(tkt101), 170);
  const split = calculateMemberSplits(
    ticketToPartyRoom(tkt101, INITIAL_RESTAURANT_STATE),
  );
  assert.equal(split.memberCount, 2);
  assert.equal(split.paidCount, 1);
  assert.equal(split.totalNet, 170);
});
