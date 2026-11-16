import {
  BellRing,
  CheckCircle2,
  Clock,
  Egg,
  Flame,
  Utensils,
} from 'lucide-react';
import { COOKING_BASES } from '../data/presets.ts';
import type { KitchenStatus, RestaurantTicket } from '../types/tamsang.ts';
import { formatDishFullName } from '../utils/pricing.ts';
import { aggregateKitchenOrders } from '../utils/aggregator.ts';
import { getTicketBoxCount } from '../utils/restaurant.ts';

interface KitchenQueueViewProps {
  tickets: RestaurantTicket[];
  onAdvanceStatus: (ticketId: string, nextStatus: KitchenStatus) => void;
}

const CHANNEL_BADGE: Record<RestaurantTicket['channel'], string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี',
};

export function KitchenQueueView({
  tickets,
  onAdvanceStatus,
}: KitchenQueueViewProps) {
  const queuedTickets = tickets.filter((t) => t.kitchenStatus === 'queued');
  const cookingTickets = tickets.filter((t) => t.kitchenStatus === 'cooking');
  const readyTickets = tickets.filter(
    (t) => t.kitchenStatus === 'ready' || t.kitchenStatus === 'served',
  );

  const activeWorkItems = [...queuedTickets, ...cookingTickets].flatMap(
    (t) => t.items,
  );
  const wokBatchSummary = aggregateKitchenOrders(activeWorkItems);

  const renderTicketCard = (
    ticket: RestaurantTicket,
    actionLabel: string | null,
    nextStatus: KitchenStatus | null,
    accentClass: string,
  ) => {
    const boxes = getTicketBoxCount(ticket);

    return (
      <article
        key={ticket.id}
        className={`rounded-2xl border bg-white p-4 shadow-xs ${accentClass}`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#EFECE4] pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-num rounded-lg bg-zinc-900 px-2.5 py-0.5 text-xs font-extrabold text-white">
                {ticket.queueNumber}
              </span>
              <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800 ring-1 ring-orange-200">
                {ticket.tableNumber}
              </span>
              <span className="text-[11px] font-medium text-zinc-500">
                {CHANNEL_BADGE[ticket.channel]}
              </span>
            </div>
            {ticket.customerNote && (
              <p className="mt-1.5 text-xs font-semibold text-amber-800">
                หมายเหตุ: {ticket.customerNote}
              </p>
            )}
          </div>
          <span className="font-mono-num shrink-0 text-xs font-bold text-zinc-600">
            {boxes} จาน
          </span>
        </div>

        <ul className="mt-3 space-y-2.5">
          {ticket.items.map((item) => {
            const dishMeta = COOKING_BASES.find(
              (b) => b.id === item.config.baseId,
            );
            return (
              <li key={item.id} className="flex items-start gap-2.5">
                {dishMeta && (
                  <img
                    src={dishMeta.imageUrl}
                    alt={dishMeta.shortName}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-[#E7E2D8]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 leading-snug">
                    <span className="font-mono-num mr-1.5 inline-block rounded bg-[#FAF8F5] px-1.5 py-0.5 text-orange-700 ring-1 ring-[#E7E2D8]">
                      x{item.quantity}
                    </span>
                    {formatDishFullName(item.config)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {actionLabel && nextStatus && (
          <button
            type="button"
            onClick={() => onAdvanceStatus(ticket.id, nextStatus)}
            className={`mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer ${
              nextStatus === 'cooking'
                ? 'bg-orange-600 hover:bg-orange-700'
                : nextStatus === 'ready'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-zinc-800 hover:bg-zinc-900'
            }`}
          >
            <span>{actionLabel}</span>
          </button>
        )}

        {ticket.kitchenStatus === 'served' && (
          <div className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>เสิร์ฟถึงโต๊ะเรียบร้อย</span>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Smart Wok Batching Banner */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900">
              <Utensils className="h-5 w-5 text-orange-600" />
              <span>สรุปรวบเมนูผัดพร้อมกัน & จำนวนไข่ที่ต้องเตรียมหน้าเตา</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              รวมรายการจากคิว "รอผัด" และ "กำลังผัด" อัตโนมัติ เพื่อให้แม่ครัวผัดรวดเดียวได้ไวขึ้น
            </p>
          </div>
          <span className="font-mono-num shrink-0 rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800 ring-1 ring-orange-200">
            คิวค้างหน้าเตา {wokBatchSummary.totalBoxes} จาน
          </span>
        </div>

        {wokBatchSummary.dishes.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="flex flex-wrap gap-2 lg:col-span-8">
              {wokBatchSummary.dishes.map((d) => (
                <div
                  key={d.signature}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2 text-xs"
                >
                  <span className="font-mono-num rounded-md bg-zinc-900 px-2 py-0.5 font-bold text-white">
                    x{d.totalQuantity}
                  </span>
                  <span className="font-semibold text-zinc-800">{d.fullName}</span>
                </div>
              ))}
            </div>

            {wokBatchSummary.addonSummary.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 lg:col-span-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Egg className="h-4 w-4 text-amber-600" />
                  <span>จำนวนไข่/ท็อปปิ้งที่ต้องทอดตอนนี้</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {wokBatchSummary.addonSummary.map((addon) => (
                    <span
                      key={addon.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 ring-1 ring-amber-200"
                    >
                      <span>{addon.name}</span>
                      <span className="font-mono-num text-amber-700">
                        x{addon.count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-emerald-700">
            ไม่มีออเดอร์ค้างหน้าเตาในขณะนี้
          </p>
        )}
      </section>

      {/* 3-Column Kitchen Display Board (KDS) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Column 1: Queued */}
        <section className="space-y-3 rounded-2xl border border-[#E7E2D8] bg-[#F4F1EA]/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <Clock className="h-4 w-4 text-zinc-600" />
              <span>รอคิวผัด (Queued)</span>
            </h3>
            <span className="font-mono-num rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-zinc-800 ring-1 ring-[#E7E2D8]">
              {queuedTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {queuedTickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#D6D0C4] py-8 text-center text-xs text-zinc-500">
                ไม่มีคิวรอผัด
              </p>
            ) : (
              queuedTickets.map((t) =>
                renderTicketCard(t, 'เริ่มผัดหน้าเตา 🔥', 'cooking', 'border-[#E7E2D8]'),
              )
            )}
          </div>
        </section>

        {/* Column 2: Cooking */}
        <section className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-orange-900">
              <Flame className="h-4 w-4 text-orange-600" />
              <span>กำลังผัดไฟลุก (Cooking)</span>
            </h3>
            <span className="font-mono-num rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {cookingTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {cookingTickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-orange-200 py-8 text-center text-xs text-orange-700/70">
                กระทะว่าง กด "เริ่มผัด" จากคิวด้านซ้ายได้เลย
              </p>
            ) : (
              cookingTickets.map((t) =>
                renderTicketCard(
                  t,
                  'ผัดเสร็จ · พร้อมเสิร์ฟ ✅',
                  'ready',
                  'border-orange-300 ring-1 ring-orange-200',
                ),
              )
            )}
          </div>
        </section>

        {/* Column 3: Ready / Served */}
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <BellRing className="h-4 w-4 text-emerald-600" />
              <span>พร้อมเสิร์ฟ / เสิร์ฟแล้ว</span>
            </h3>
            <span className="font-mono-num rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {readyTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyTickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-emerald-200 py-8 text-center text-xs text-emerald-800/70">
                ยังไม่มีจานที่พร้อมเสิร์ฟ
              </p>
            ) : (
              readyTickets.map((t) =>
                renderTicketCard(
                  t,
                  t.kitchenStatus === 'ready' ? 'ยืนยันเสิร์ฟถึงโต๊ะแล้ว' : null,
                  t.kitchenStatus === 'ready' ? 'served' : null,
                  'border-emerald-200',
                ),
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
