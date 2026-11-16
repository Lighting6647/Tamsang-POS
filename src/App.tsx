import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Receipt,
  UtensilsCrossed,
} from 'lucide-react';
import { CashierCheckoutView } from './components/CashierCheckoutView.tsx';
import { HeaderBar } from './components/HeaderBar.tsx';
import { KitchenQueueView } from './components/KitchenQueueView.tsx';
import { PosMenuOrderView } from './components/PosMenuOrderView.tsx';
import { RoomSettingsModal } from './components/RoomSettingsModal.tsx';
import { TableQrModal } from './components/TableQrModal.tsx';
import { INITIAL_RESTAURANT_STATE } from './data/presets.ts';
import type {
  KitchenStatus,
  OrderChannel,
  OrderItem,
  PaymentMethod,
  RestaurantState,
  RestaurantTicket,
} from './types/tamsang.ts';
import {
  generateKitchenTicketsText,
  getRestaurantStats,
} from './utils/restaurant.ts';

type ActiveTab = 'pos' | 'kds' | 'cashier';

const STORAGE_KEY = 'tamsang_pos_restaurant_v2';

function loadInitialRestaurantState(): RestaurantState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_RESTAURANT_STATE;
    const parsed = JSON.parse(raw) as Partial<RestaurantState>;
    if (!parsed || !Array.isArray(parsed.tickets)) {
      return INITIAL_RESTAURANT_STATE;
    }
    return {
      ...INITIAL_RESTAURANT_STATE,
      ...parsed,
    };
  } catch {
    return INITIAL_RESTAURANT_STATE;
  }
}

function getInitialTableFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get('table');
  if (!tableParam) return null;
  const num = Number.parseInt(tableParam, 10);
  if (Number.isFinite(num) && num >= 1 && num <= 30) {
    return `โต๊ะ ${num}`;
  }
  return null;
}

export function App() {
  const [state, setState] = useState<RestaurantState>(loadInitialRestaurantState);
  const [scannedTable, setScannedTable] = useState<string | null>(
    getInitialTableFromUrl,
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [selectedChannel, setSelectedChannel] = useState<OrderChannel>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>(
    () => getInitialTableFromUrl() ?? 'โต๊ะ 3',
  );
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTableQrOpen, setIsTableQrOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const stats = useMemo(() => getRestaurantStats(state.tickets), [state.tickets]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleAddCartItem = (newItem: Omit<OrderItem, 'id' | 'createdAt'>) => {
    const item: OrderItem = {
      ...newItem,
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setCart((prev) => [...prev, item]);
    showToast(`เพิ่มเมนูลงตะกร้าแล้ว (${item.unitPrice * item.quantity}฿)`);
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmitCartToKitchen = (customerNote: string) => {
    if (cart.length === 0) return;

    const queueNumber = `Q-${state.nextQueueSeq}`;
    const tableLabel =
      selectedChannel === 'dine_in'
        ? selectedTable
        : selectedChannel === 'takeaway'
          ? 'กลับบ้าน'
          : 'เดลิเวอรี';

    const newTicket: RestaurantTicket = {
      id: `tkt-${Date.now()}`,
      queueNumber,
      channel: selectedChannel,
      tableNumber: tableLabel,
      customerNote: customerNote.trim(),
      kitchenStatus: 'queued',
      paymentStatus: 'unpaid',
      items: cart.map((item) => ({ ...item })),
      deliveryFee: 0,
      discountAmount: 0,
      paidMembers: [],
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      nextQueueSeq: prev.nextQueueSeq + 1,
      tickets: [newTicket, ...prev.tickets],
    }));
    setCart([]);
    showToast(`ส่งเข้าครัวแล้ว! ออกบัตรคิว ${queueNumber} (${tableLabel})`);
  };

  const handleAdvanceKitchenStatus = (
    ticketId: string,
    nextStatus: KitchenStatus,
  ) => {
    setState((prev) => {
      const target = prev.tickets.find((t) => t.id === ticketId);
      if (target) {
        const statusThai =
          nextStatus === 'cooking'
            ? 'กำลังผัดหน้าเตา'
            : nextStatus === 'ready'
              ? 'ผัดเสร็จพร้อมเสิร์ฟ'
              : 'เสิร์ฟถึงโต๊ะแล้ว';
        showToast(`อัปเดตคิว ${target.queueNumber} → ${statusThai}`);
      }
      return {
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId ? { ...t, kitchenStatus: nextStatus } : t,
        ),
      };
    });
  };

  const handleUpdateTicketFees = (
    ticketId: string,
    updates: Partial<Pick<RestaurantTicket, 'deliveryFee' | 'discountAmount'>>,
  ) => {
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.id === ticketId ? { ...t, ...updates } : t,
      ),
    }));
  };

  const handleMarkTicketPaid = (ticketId: string, method: PaymentMethod) => {
    setState((prev) => {
      const target = prev.tickets.find((t) => t.id === ticketId);
      if (target) {
        showToast(
          `ปิดบิล ${target.queueNumber} (${target.tableNumber}) เรียบร้อย`,
        );
      }
      return {
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                paymentStatus: 'paid',
                paymentMethod: method,
                paidMembers: Array.from(
                  new Set(t.items.map((item) => item.memberName)),
                ),
              }
            : t,
        ),
      };
    });
  };

  const handleReopenTicketPayment = (ticketId: string) => {
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, paymentStatus: 'unpaid', paymentMethod: undefined }
          : t,
      ),
    }));
    showToast('เปิดบิลกลับมาแก้ไขการชำระเงินแล้ว');
  };

  const handleToggleMemberPaid = (ticketId: string, memberName: string) => {
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const exists = t.paidMembers.includes(memberName);
        const nextPaid = exists
          ? t.paidMembers.filter((m) => m !== memberName)
          : [...t.paidMembers, memberName];
        const allMembers = Array.from(
          new Set(t.items.map((item) => item.memberName)),
        );
        const isAllPaid =
          allMembers.length > 0 &&
          allMembers.every((m) => nextPaid.includes(m));
        return {
          ...t,
          paidMembers: nextPaid,
          paymentStatus: isAllPaid ? 'paid' : 'unpaid',
          paymentMethod: isAllPaid ? 'promptpay' : t.paymentMethod,
        };
      }),
    }));
  };

  const handleCopyKitchenSummary = async () => {
    const text = generateKitchenTicketsText(state);
    try {
      await navigator.clipboard.writeText(text);
      showToast('คัดลอกใบสรุปคิวครัวลงคลิปบอร์ดแล้ว');
    } catch {
      setActiveTab('kds');
      showToast('เปิดหน้าจอคิวครัวให้เรียบร้อยแล้ว');
    }
  };

  const handleSaveSettings = (
    updates: Pick<
      RestaurantState,
      'shopName' | 'branchName' | 'hostName' | 'promptPayId' | 'tableCount'
    >,
  ) => {
    setState((prev) => ({
      ...prev,
      ...updates,
    }));
    showToast('บันทึกการตั้งค่าร้านเรียบร้อย');
  };

  const handleResetDemo = () => {
    setState(INITIAL_RESTAURANT_STATE);
    setCart([]);
    showToast('คืนค่าข้อมูลตัวอย่างร้านอาหารเรียบร้อย');
  };

  const handleClearTickets = () => {
    setState((prev) => ({
      ...prev,
      nextQueueSeq: 101,
      tickets: [],
    }));
    showToast('ล้างคิวและบิลทั้งหมดแล้ว');
  };

  const handleSelectTablePreview = (tableNumber: string) => {
    setSelectedChannel('dine_in');
    setSelectedTable(tableNumber);
    setScannedTable(tableNumber);
    setActiveTab('pos');
    showToast(`สลับเป็นโหมดลูกค้าสแกนสั่งจาก ${tableNumber} แล้ว`);
  };

  const cartBoxes = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FAF8F5] text-zinc-900">
      <HeaderBar
        state={state}
        activeTableQuery={scannedTable}
        onClearTableQuery={() => setScannedTable(null)}
        onOpenTableQr={() => setIsTableQrOpen(true)}
        onCopyKitchenSummary={handleCopyKitchenSummary}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Primary Restaurant POS Switcher */}
      <nav
        aria-label="เมนูหลักระบบร้านอาหาร"
        className="sticky top-0 z-30 border-b border-[#E7E2D8] bg-white/95 backdrop-blur-xs"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1.5 px-4 py-2.5 sm:gap-2 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-[#FAF8F5] hover:text-zinc-900'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4 shrink-0" />
            <span>หน้าร้าน & สั่งตามโต๊ะ (POS)</span>
            {cartBoxes > 0 && (
              <span
                className={`font-mono-num rounded-full px-2 py-0.5 text-[11px] sm:text-xs ${
                  activeTab === 'pos'
                    ? 'bg-orange-700 text-orange-50'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                ตะกร้า {cartBoxes}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kds')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm cursor-pointer ${
              activeTab === 'kds'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-[#FAF8F5] hover:text-zinc-900'
            }`}
          >
            <Flame className="h-4 w-4 shrink-0" />
            <span>จอคิวครัว (KDS)</span>
            <span
              className={`font-mono-num rounded-full px-2 py-0.5 text-[11px] sm:text-xs ${
                activeTab === 'kds'
                  ? 'bg-orange-700 text-orange-50'
                  : stats.activeKitchenCount > 0
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-[#FAF8F5] text-zinc-700'
              }`}
            >
              ค้างผัด {stats.activeKitchenCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cashier')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm cursor-pointer ${
              activeTab === 'cashier'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-[#FAF8F5] hover:text-zinc-900'
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>คิดเงิน / เช็คบิล & QR</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] sm:text-xs ${
                activeTab === 'cashier'
                  ? 'bg-orange-700 text-orange-50'
                  : stats.unpaidCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {stats.unpaidCount > 0
                ? `รอชำระ ${stats.unpaidCount}`
                : 'เคลียร์ครบ'}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'pos' && (
          <PosMenuOrderView
            tableCount={state.tableCount}
            selectedChannel={selectedChannel}
            selectedTable={selectedTable}
            activeTickets={state.tickets}
            cart={cart}
            onChangeChannel={setSelectedChannel}
            onChangeTable={setSelectedTable}
            onAddCartItem={handleAddCartItem}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onSubmitCartToKitchen={handleSubmitCartToKitchen}
          />
        )}

        {activeTab === 'kds' && (
          <KitchenQueueView
            tickets={state.tickets}
            onAdvanceStatus={handleAdvanceKitchenStatus}
          />
        )}

        {activeTab === 'cashier' && (
          <CashierCheckoutView
            state={state}
            onUpdateTicketFees={handleUpdateTicketFees}
            onMarkTicketPaid={handleMarkTicketPaid}
            onReopenTicketPayment={handleReopenTicketPayment}
            onToggleMemberPaid={handleToggleMemberPaid}
          />
        )}
      </main>

      {isTableQrOpen && (
        <TableQrModal
          shopName={state.shopName}
          tableCount={state.tableCount}
          onClose={() => setIsTableQrOpen(false)}
          onSelectTablePreview={handleSelectTablePreview}
        />
      )}

      {isSettingsOpen && (
        <RoomSettingsModal
          state={state}
          onClose={() => setIsSettingsOpen(false)}
          onSaveSettings={handleSaveSettings}
          onResetDemo={handleResetDemo}
          onClearTickets={handleClearTickets}
        />
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
