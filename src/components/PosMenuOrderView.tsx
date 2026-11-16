import { useState } from 'react';
import {
  Bike,
  Clock,
  Flame,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import {
  COOKING_BASES,
  MENU_CATEGORIES,
  QUICK_PRESETS,
} from '../data/presets.ts';
import type {
  CookingBaseOption,
  MenuCategory,
  OrderChannel,
  OrderItem,
  RestaurantTicket,
} from '../types/tamsang.ts';
import { calculateDishUnitPrice, formatDishFullName, getDishParts } from '../utils/pricing.ts';
import { DishCustomizerModal } from './DishCustomizerModal.tsx';

interface PosMenuOrderViewProps {
  tableCount: number;
  selectedChannel: OrderChannel;
  selectedTable: string;
  activeTickets: RestaurantTicket[];
  cart: OrderItem[];
  onChangeChannel: (channel: OrderChannel) => void;
  onChangeTable: (table: string) => void;
  onAddCartItem: (item: Omit<OrderItem, 'id' | 'createdAt'>) => void;
  onUpdateCartQuantity: (itemId: string, delta: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onSubmitCartToKitchen: (customerNote: string) => void;
}

export function PosMenuOrderView({
  tableCount,
  selectedChannel,
  selectedTable,
  activeTickets,
  cart,
  onChangeChannel,
  onChangeTable,
  onAddCartItem,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onSubmitCartToKitchen,
}: PosMenuOrderViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingDish, setCustomizingDish] =
    useState<CookingBaseOption | null>(null);
  const [customerNote, setCustomerNote] = useState('');

  const tables = Array.from({ length: tableCount }, (_, i) => `โต๊ะ ${i + 1}`);
  const activeUnpaidByTable = new Set(
    activeTickets
      .filter((t) => t.paymentStatus === 'unpaid' && t.channel === 'dine_in')
      .map((t) => t.tableNumber),
  );

  const filteredBases = COOKING_BASES.filter((base) => {
    const matchesCat =
      selectedCategory === 'all' || base.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCat;
    return (
      matchesCat &&
      (base.name.toLowerCase().includes(q) ||
        base.shortName.toLowerCase().includes(q) ||
        base.tag.toLowerCase().includes(q))
    );
  });

  const cartTotalBoxes = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalAmount = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const destinationLabel =
    selectedChannel === 'dine_in'
      ? selectedTable
      : selectedChannel === 'takeaway'
        ? 'สั่งกลับบ้าน'
        : 'เดลิเวอรี';

  const handleQuickPresetAdd = (preset: (typeof QUICK_PRESETS)[number]) => {
    const unitPrice = calculateDishUnitPrice(preset.config);
    onAddCartItem({
      memberName: `ลูกค้า${destinationLabel}`,
      department: destinationLabel,
      config: {
        ...preset.config,
        addonIds: [...preset.config.addonIds],
        veggieNotes: [...preset.config.veggieNotes],
      },
      quantity: 1,
      unitPrice,
    });
  };

  const handleConfirmSubmit = () => {
    if (cart.length === 0) return;
    onSubmitCartToKitchen(customerNote);
    setCustomerNote('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left 8 Columns: Table Selector + Visual Menu Grid */}
      <div className="space-y-5 lg:col-span-8">
        {/* Order Channel & Table Selector */}
        <section className="rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                เลือกช่องทางการสั่ง & เลขโต๊ะ
              </h2>
              <p className="text-xs text-zinc-500">
                กดเลือกโต๊ะหรือประเภทออเดอร์ แล้วจิ้มรูปเมนูอาหารด้านล่างเพื่อสั่งเข้าครัว
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'dine_in', label: 'ทานที่ร้าน', icon: Utensils },
                  { id: 'takeaway', label: 'สั่งกลับบ้าน', icon: PackageCheck },
                  { id: 'delivery', label: 'เดลิเวอรี', icon: Bike },
                ] as const
              ).map((ch) => {
                const Icon = ch.icon;
                const active = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onChangeChannel(ch.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-orange-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedChannel === 'dine_in' && (
            <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[#EFECE4] pt-3.5">
              {tables.map((table) => {
                const isSelected = selectedTable === table;
                const hasOpenBill = activeUnpaidByTable.has(table);
                return (
                  <button
                    key={table}
                    type="button"
                    onClick={() => onChangeTable(table)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                        : hasOpenBill
                          ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                          : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <span>{table}</span>
                    {hasOpenBill && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isSelected ? 'bg-amber-400' : 'bg-amber-500'
                        }`}
                        title="โต๊ะนี้มีบิลเปิดอยู่"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Hit Combo Strip with Real Photo Thumbnails */}
        <section className="rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>เมนูจานด่วนยอดฮิต (กดปุ๊บลงตะกร้าทันที)</span>
          </div>
          <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
            {QUICK_PRESETS.map((preset) => {
              const price = calculateDishUnitPrice(preset.config);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickPresetAdd(preset)}
                  className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-2 pr-3 text-left transition-all hover:border-orange-300 hover:bg-orange-50/70 cursor-pointer"
                >
                  <img
                    src={preset.imageUrl}
                    alt={preset.title}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                        {preset.badge}
                      </span>
                      <span className="font-mono-num text-xs font-bold text-zinc-700">
                        {price}฿
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-zinc-900 group-hover:text-orange-800">
                      {preset.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Category Filter & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {MENU_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-[#E7E2D8] bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนูตามสั่ง..."
              aria-label="ค้นหาเมนูอาหาร"
              className="w-full rounded-xl border border-[#E7E2D8] bg-white py-2 pr-3 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Visual Food Card Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBases.map((dish) => (
            <article
              key={dish.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setCustomizingDish(dish)}
                className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 text-left cursor-pointer"
              >
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 rounded-lg bg-white/95 px-2 py-0.5 text-[11px] font-bold text-orange-700 shadow-xs">
                  {dish.tag}
                </span>
                <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-lg bg-zinc-950/75 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Clock className="h-3 w-3 text-amber-300" />
                  ~{dish.prepMinutes} นาที
                </span>
              </button>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900">
                      {dish.name}
                    </h3>
                    <span className="font-mono-num shrink-0 text-sm font-extrabold text-orange-700">
                      {dish.basePrice}฿+
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    เลือกเนื้อสัตว์, ไข่ดาว/ไข่เจียว และความเผ็ดได้ตามสั่ง
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomizingDish(dish)}
                  className="mt-3.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 ring-1 ring-orange-200 transition-colors hover:bg-orange-600 hover:text-white cursor-pointer"
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>เลือกเนื้อสัตว์ & สั่งเลย</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Right 4 Columns: Active Order Cart Sidebar */}
      <aside
        aria-label="ตะกร้าสั่งอาหาร"
        className="rounded-2xl border border-[#E7E2D8] bg-white shadow-xs lg:sticky lg:top-20 lg:col-span-4"
      >
        <div className="border-b border-[#E7E2D8] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
              <h2 className="text-base font-bold text-zinc-900">
                ตะกร้าส่งเข้าครัว
              </h2>
            </div>
            <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-bold text-white">
              {destinationLabel}
            </span>
          </div>
          {selectedChannel === 'dine_in' &&
            activeUnpaidByTable.has(selectedTable) && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                {selectedTable} มีออเดอร์เปิดอยู่ — กดส่งเข้าครัวเพื่อออกคิวใหม่และรวมบิลโต๊ะให้อัตโนมัติ
              </p>
            )}
        </div>

        <div className="max-h-[420px] divide-y divide-[#EFECE4] overflow-y-auto px-4 sm:px-5">
          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-zinc-600">
                ยังไม่มีเมนูในตะกร้า
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                จิ้มที่รูปอาหารทางซ้ายเพื่อเลือกเนื้อสัตว์และท็อปปิ้ง
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const dishMeta = COOKING_BASES.find(
                (b) => b.id === item.config.baseId,
              );
              const parts = getDishParts(item.config);
              const fullName = formatDishFullName(item.config);

              return (
                <div key={item.id} className="flex gap-3 py-3.5">
                  {dishMeta && (
                    <img
                      src={dishMeta.imageUrl}
                      alt={parts.baseName}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#E7E2D8]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-zinc-900 leading-snug">
                        {fullName}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemoveCartItem(item.id)}
                        aria-label="ลบรายการจากตะกร้า"
                        className="shrink-0 text-zinc-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      ผู้สั่ง: {item.memberName}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-[#E7E2D8] bg-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={() => onUpdateCartQuantity(item.id, -1)}
                          aria-label="ลดจำนวน"
                          className="flex h-7 w-7 items-center justify-center text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono-num w-6 text-center text-xs font-bold text-zinc-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCartQuantity(item.id, 1)}
                          aria-label="เพิ่มจำนวน"
                          className="flex h-7 w-7 items-center justify-center text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-mono-num text-sm font-bold text-orange-700">
                        {(item.unitPrice * item.quantity).toLocaleString('th-TH')}฿
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[#E7E2D8] bg-[#FAF8F5] p-4 rounded-b-2xl sm:p-5">
          <input
            type="text"
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="หมายเหตุรวมบิล เช่น เสิร์ฟพร้อมกัน / แยกพริกน้ำปลา"
            aria-label="หมายเหตุรวมของออเดอร์"
            className="mb-3 w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none"
          />

          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-zinc-600">
              รวมทั้งหมด ({cartTotalBoxes} จาน)
            </span>
            <span className="font-mono-num text-xl font-extrabold text-zinc-900">
              {cartTotalAmount.toLocaleString('th-TH')}฿
            </span>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleConfirmSubmit}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-zinc-300 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>ส่งออเดอร์เข้าครัวทันที</span>
          </button>
        </div>
      </aside>

      {customizingDish && (
        <DishCustomizerModal
          dish={customizingDish}
          defaultMemberName={`ลูกค้า${destinationLabel}`}
          tableLabel={destinationLabel}
          onClose={() => setCustomizingDish(null)}
          onConfirmAdd={onAddCartItem}
        />
      )}
    </div>
  );
}
