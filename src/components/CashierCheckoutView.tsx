import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  QrCode,
  Receipt,
  Users,
  X,
} from 'lucide-react';
import type {
  MemberBillSplit,
  PaymentMethod,
  RestaurantState,
  RestaurantTicket,
} from '../types/tamsang.ts';
import { calculateMemberSplits } from '../utils/billSplitter.ts';
import { formatDishFullName } from '../utils/pricing.ts';
import {
  formatPromptPayDisplay,
  generatePromptPayPayload,
  isValidPromptPayId,
} from '../utils/promptpay.ts';
import {
  getTicketBoxCount,
  getTicketFoodSubtotal,
  getTicketNetTotal,
  ticketToPartyRoom,
} from '../utils/restaurant.ts';

interface CashierCheckoutViewProps {
  state: RestaurantState;
  onUpdateTicketFees: (
    ticketId: string,
    updates: Partial<Pick<RestaurantTicket, 'deliveryFee' | 'discountAmount'>>,
  ) => void;
  onMarkTicketPaid: (ticketId: string, method: PaymentMethod) => void;
  onReopenTicketPayment: (ticketId: string) => void;
  onToggleMemberPaid: (ticketId: string, memberName: string) => void;
}

const KITCHEN_STATUS_LABEL: Record<RestaurantTicket['kitchenStatus'], string> = {
  queued: 'รอคิวผัด',
  cooking: 'กำลังผัด',
  ready: 'พร้อมเสิร์ฟ',
  served: 'เสิร์ฟแล้ว',
};

export function CashierCheckoutView({
  state,
  onUpdateTicketFees,
  onMarkTicketPaid,
  onReopenTicketPayment,
  onToggleMemberPaid,
}: CashierCheckoutViewProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    () =>
      state.tickets.find((t) => t.paymentStatus === 'unpaid')?.id ??
      state.tickets[0]?.id ??
      '',
  );
  const [checkoutTab, setCheckoutTab] = useState<'whole' | 'split'>('whole');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('promptpay');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [wholeQrDataUrl, setWholeQrDataUrl] = useState<string>('');
  const [wholeQrPayload, setWholeQrPayload] = useState<string>('');
  const [splitModalMember, setSplitModalMember] =
    useState<MemberBillSplit | null>(null);
  const [splitQrDataUrl, setSplitQrDataUrl] = useState<string>('');
  const [splitQrPayload, setSplitQrPayload] = useState<string>('');

  const filteredTickets = state.tickets.filter((t) =>
    filterStatus === 'all' ? true : t.paymentStatus === filterStatus,
  );

  const selectedTicket =
    state.tickets.find((t) => t.id === selectedTicketId) ??
    filteredTickets[0] ??
    null;

  const validPromptPay = isValidPromptPayId(state.promptPayId);
  const ticketNetTotal = selectedTicket ? getTicketNetTotal(selectedTicket) : 0;
  const ticketFoodSubtotal = selectedTicket
    ? getTicketFoodSubtotal(selectedTicket)
    : 0;

  // Build QR for whole table checkout
  useEffect(() => {
    let cancelled = false;
    async function buildWholeQr() {
      if (!selectedTicket || !validPromptPay || ticketNetTotal <= 0) {
        setWholeQrDataUrl('');
        setWholeQrPayload('');
        return;
      }
      try {
        const payload = generatePromptPayPayload(state.promptPayId, ticketNetTotal);
        const url = await QRCode.toDataURL(payload, {
          width: 260,
          margin: 2,
          color: { dark: '#18181B', light: '#FFFFFF' },
        });
        if (!cancelled) {
          setWholeQrPayload(payload);
          setWholeQrDataUrl(url);
        }
      } catch {
        if (!cancelled) {
          setWholeQrDataUrl('');
          setWholeQrPayload('');
        }
      }
    }
    buildWholeQr();
    return () => {
      cancelled = true;
    };
  }, [selectedTicket, state.promptPayId, validPromptPay, ticketNetTotal]);

  // Build QR for individual member split modal
  useEffect(() => {
    let cancelled = false;
    async function buildSplitQr() {
      if (!splitModalMember || !validPromptPay) {
        setSplitQrDataUrl('');
        setSplitQrPayload('');
        return;
      }
      try {
        const payload = generatePromptPayPayload(
          state.promptPayId,
          splitModalMember.netPayable,
        );
        const url = await QRCode.toDataURL(payload, {
          width: 280,
          margin: 2,
          color: { dark: '#18181B', light: '#FFFFFF' },
        });
        if (!cancelled) {
          setSplitQrPayload(payload);
          setSplitQrDataUrl(url);
        }
      } catch {
        if (!cancelled) {
          setSplitQrDataUrl('');
          setSplitQrPayload('');
        }
      }
    }
    buildSplitQr();
    return () => {
      cancelled = true;
    };
  }, [splitModalMember, state.promptPayId, validPromptPay]);

  const splitReport = selectedTicket
    ? calculateMemberSplits(ticketToPartyRoom(selectedTicket, state))
    : null;

  const cashNum = Number(cashReceived) || 0;
  const cashChange = Math.max(0, cashNum - ticketNetTotal);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left 5 Columns: Ticket / Table Bills List */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white shadow-xs lg:col-span-5">
        <div className="border-b border-[#E7E2D8] px-4 py-4 sm:px-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900">
            <Receipt className="h-5 w-5 text-orange-600" />
            <span>รายการบิลรอคิดเงิน & ประวัติ</span>
          </h2>
          <div className="mt-3 flex gap-1.5">
            {(
              [
                { id: 'all', label: `ทั้งหมด (${state.tickets.length})` },
                {
                  id: 'unpaid',
                  label: `รอชำระ (${state.tickets.filter((t) => t.paymentStatus === 'unpaid').length})`,
                },
                {
                  id: 'paid',
                  label: `ชำระแล้ว (${state.tickets.filter((t) => t.paymentStatus === 'paid').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#EFECE4]">
          {filteredTickets.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              ไม่มีบิลในสถานะนี้
            </p>
          ) : (
            filteredTickets.map((t) => {
              const active = selectedTicket?.id === t.id;
              const net = getTicketNetTotal(t);
              const boxes = getTicketBoxCount(t);

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(t.id);
                    setCashReceived('');
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 cursor-pointer ${
                    active ? 'bg-orange-50/80' : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono-num rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-white">
                        {t.queueNumber}
                      </span>
                      <span className="text-sm font-bold text-zinc-900">
                        {t.tableNumber}
                      </span>
                      <span className="rounded bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-[#E7E2D8]">
                        {KITCHEN_STATUS_LABEL[t.kitchenStatus]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {boxes} จาน ·{' '}
                      {t.paymentStatus === 'paid'
                        ? `ชำระแล้ว (${t.paymentMethod === 'cash' ? 'เงินสด' : 'PromptPay'})`
                        : 'รอชำระเงิน'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono-num text-base font-extrabold text-zinc-900">
                      {net.toLocaleString('th-TH')}฿
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        t.paymentStatus === 'paid'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {t.paymentStatus === 'paid' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>ปิดบิลแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>รอชำระ</span>
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Right 7 Columns: Receipt & Payment Controls */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-xs sm:p-6 lg:col-span-7">
        {!selectedTicket ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            เลือกบิลทางซ้ายเพื่อดูรายละเอียดและคิดเงิน
          </div>
        ) : (
          <div className="space-y-5">
            {/* Ticket Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFECE4] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-num rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-extrabold text-white">
                    {selectedTicket.queueNumber}
                  </span>
                  <h3 className="text-lg font-extrabold text-zinc-900">
                    ใบเสร็จ · {selectedTicket.tableNumber}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  สถานะครัว: {KITCHEN_STATUS_LABEL[selectedTicket.kitchenStatus]} · PromptPay ร้าน:{' '}
                  {formatPromptPayDisplay(state.promptPayId)}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  selectedTicket.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                }`}
              >
                {selectedTicket.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ชำระเงินแล้ว</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>รอรับชำระเงิน</span>
                  </>
                )}
              </span>
            </div>

            {/* Itemized Receipt */}
            <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4">
              <ul className="space-y-2">
                {selectedTicket.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">
                        {formatDishFullName(item.config)}
                      </span>
                      <span className="ml-2 text-zinc-500">
                        ({item.memberName} · x{item.quantity})
                      </span>
                    </div>
                    <span className="font-mono-num shrink-0 font-bold text-zinc-900">
                      {(item.unitPrice * item.quantity).toLocaleString('th-TH')}฿
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E7E2D8] pt-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600">
                    ค่าส่ง / ค่ากล่องเพิ่มเติม (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={selectedTicket.deliveryFee}
                    onChange={(e) =>
                      onUpdateTicketFees(selectedTicket.id, {
                        deliveryFee: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-[#E7E2D8] bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600">
                    ส่วนลดท้ายบิล (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={selectedTicket.discountAmount}
                    onChange={(e) =>
                      onUpdateTicketFees(selectedTicket.id, {
                        discountAmount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-[#E7E2D8] bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between border-t border-[#E7E2D8] pt-3">
                <div className="text-xs text-zinc-500">
                  ค่าอาหาร {ticketFoodSubtotal.toLocaleString('th-TH')}฿
                </div>
                <div className="text-right">
                  <span className="mr-2 text-xs font-bold text-zinc-600">
                    ยอดสุทธิที่ต้องชำระ
                  </span>
                  <span className="font-mono-num text-2xl font-extrabold text-orange-700">
                    {ticketNetTotal.toLocaleString('th-TH')}฿
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout Mode Switcher: Whole Bill vs Split by Person */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutTab('whole')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  checkoutTab === 'whole'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>เช็คบิลรวมทั้งโต๊ะ</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutTab('split')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  checkoutTab === 'split'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>แยกจ่าย / หารค่าข้าวรายคน ({splitReport?.memberCount ?? 0})</span>
              </button>
            </div>

            {checkoutTab === 'whole' ? (
              <div className="space-y-4">
                {/* Payment Method Switch */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayMethod('promptpay')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer ${
                      payMethod === 'promptpay'
                        ? 'border-orange-600 bg-orange-50 text-orange-800 ring-1 ring-orange-600'
                        : 'border-[#E7E2D8] bg-white text-zinc-700'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QR PromptPay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer ${
                      payMethod === 'cash'
                        ? 'border-orange-600 bg-orange-50 text-orange-800 ring-1 ring-orange-600'
                        : 'border-[#E7E2D8] bg-white text-zinc-700'
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>เงินสด + ทอนเงิน</span>
                  </button>
                </div>

                {payMethod === 'promptpay' ? (
                  <div className="flex flex-col items-center rounded-2xl border border-[#E7E2D8] bg-[#FAF8F5] p-5 text-center">
                    {!validPromptPay ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          เลข PromptPay ร้านยังไม่ถูกต้อง กรุณาตั้งค่าในเมนู "ตั้งค่าร้าน"
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-[#E7E2D8] bg-white p-3">
                          {wholeQrDataUrl ? (
                            <img
                              src={wholeQrDataUrl}
                              alt={`PromptPay QR สำหรับ ${selectedTicket.tableNumber}`}
                              className="h-48 w-48 object-contain"
                            />
                          ) : (
                            <div className="flex h-48 w-48 items-center justify-center text-xs text-zinc-400">
                              กำลังสร้าง QR...
                            </div>
                          )}
                        </div>
                        <p className="font-mono-num mt-3 text-base font-extrabold text-orange-700">
                          ยอดโอน {ticketNetTotal.toLocaleString('th-TH')} บาท
                        </p>
                        {wholeQrPayload && (
                          <p className="font-mono-num mt-1 max-w-full truncate text-[10px] text-zinc-400">
                            EMVCo: {wholeQrPayload}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-[#E7E2D8] bg-[#FAF8F5] p-4">
                    <label className="block text-xs font-bold text-zinc-700">
                      รับเงินสดจากลูกค้า (บาท)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[100, 200, 500, 1000].map((banknote) => (
                        <button
                          key={banknote}
                          type="button"
                          onClick={() => setCashReceived(String(banknote))}
                          className="font-mono-num rounded-lg border border-[#E7E2D8] bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 hover:border-orange-400 cursor-pointer"
                        >
                          {banknote}฿
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashReceived(String(ticketNetTotal))}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 cursor-pointer"
                      >
                        รับพอดี ({ticketNetTotal}฿)
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="พิมพ์จำนวนเงินที่รับมา..."
                      className="font-mono-num w-full rounded-xl border border-[#E7E2D8] bg-white px-3.5 py-2.5 text-base font-bold text-zinc-900 focus:border-orange-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between border-t border-[#E7E2D8] pt-2.5 text-sm font-bold">
                      <span className="text-zinc-600">เงินทอน</span>
                      <span className="font-mono-num text-xl font-extrabold text-emerald-700">
                        {cashNum >= ticketNetTotal
                          ? `${cashChange.toLocaleString('th-TH')}฿`
                          : `ขาดอีก ${(ticketNetTotal - cashNum).toLocaleString('th-TH')}฿`}
                      </span>
                    </div>
                  </div>
                )}

                {selectedTicket.paymentStatus === 'unpaid' ? (
                  <button
                    type="button"
                    onClick={() => onMarkTicketPaid(selectedTicket.id, payMethod)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>ยืนยันรับชำระเงินเรียบร้อย (ปิดบิล)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onReopenTicketPayment(selectedTicket.id)}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    <span>เปิดบิลกลับมาแก้ไขการชำระเงิน</span>
                  </button>
                )}
              </div>
            ) : (
              /* Split Bill Per Person Mode */
              <div className="space-y-3">
                {splitReport?.members.map((member) => (
                  <div
                    key={member.memberName}
                    className={`flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                      member.isPaid
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-[#E7E2D8] bg-[#FAF8F5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900">
                          {member.memberName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            member.isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {member.isPaid ? 'โอนแล้ว' : 'รอโอน'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {member.itemCount} จาน · ยอดสุทธิ{' '}
                        <strong className="font-mono-num text-orange-700">
                          {member.netPayable.toFixed(2)}฿
                        </strong>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitModalMember(member)}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>QR รายคน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onToggleMemberPaid(selectedTicket.id, member.memberName)
                        }
                        className="rounded-lg border border-[#E7E2D8] bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                      >
                        {member.isPaid ? 'ยกเลิก' : 'ติ๊กโอนแล้ว'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Individual Split PromptPay QR Modal */}
      {splitModalMember && selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="split-qr-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3">
              <div>
                <h3 id="split-qr-title" className="text-base font-bold text-zinc-900">
                  PromptPay · {splitModalMember.memberName}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedTicket.tableNumber} ({selectedTicket.queueNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSplitModalMember(null)}
                aria-label="ปิดหน้าต่าง QR รายคน"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 text-center">
              <div className="mx-auto inline-flex rounded-2xl border border-[#E7E2D8] bg-white p-3">
                {splitQrDataUrl ? (
                  <img
                    src={splitQrDataUrl}
                    alt={`QR สำหรับ ${splitModalMember.memberName}`}
                    className="h-52 w-52 object-contain"
                  />
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center text-xs text-zinc-400">
                    กำลังสร้าง QR...
                  </div>
                )}
              </div>
              <p className="font-mono-num mt-3 text-xl font-extrabold text-orange-700">
                {splitModalMember.netPayable.toFixed(2)} บาท
              </p>
              {splitQrPayload && (
                <p className="font-mono-num mt-1 truncate text-[10px] text-zinc-400">
                  EMVCo: {splitQrPayload}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitModalMember(null)}
                className="min-h-[40px] flex-1 rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!splitModalMember.isPaid) {
                    onToggleMemberPaid(
                      selectedTicket.id,
                      splitModalMember.memberName,
                    );
                  }
                  setSplitModalMember(null);
                }}
                className="min-h-[40px] flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
              >
                แจ้งโอนสำเร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
