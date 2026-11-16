import { useState } from 'react';
import { Check, Clock, Flame, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import {
  ADDON_OPTIONS,
  DISH_FORMATS,
  MEAT_OPTIONS,
  PORTION_OPTIONS,
  SPICE_LEVELS,
  VEGGIE_PREFS,
} from '../data/presets.ts';
import type {
  CookingBaseOption,
  CustomDishConfig,
  DishFormat,
  OrderItem,
  PortionSize,
  SpiceLevel,
} from '../types/tamsang.ts';
import { calculateDishUnitPrice, formatDishFullName } from '../utils/pricing.ts';

interface DishCustomizerModalProps {
  dish: CookingBaseOption;
  defaultMemberName: string;
  tableLabel: string;
  onClose: () => void;
  onConfirmAdd: (item: Omit<OrderItem, 'id' | 'createdAt'>) => void;
}

export function DishCustomizerModal({
  dish,
  defaultMemberName,
  tableLabel,
  onClose,
  onConfirmAdd,
}: DishCustomizerModalProps) {
  const [config, setConfig] = useState<CustomDishConfig>({
    format: dish.recommendedFormats[0] ?? 'rice',
    baseId: dish.id,
    meatId: dish.id === 'kana' ? 'crispy_pork' : 'pork_mince',
    spice: dish.id === 'garlic' || dish.id === 'pad_see_ew' ? 'none' : 'medium',
    portion: 'regular',
    addonIds: [],
    veggieNotes: [],
    customNote: '',
  });
  const [quantity, setQuantity] = useState(1);
  const [memberName, setMemberName] = useState(defaultMemberName);

  const unitPrice = calculateDishUnitPrice(config);
  const lineTotal = unitPrice * quantity;
  const previewName = formatDishFullName(config);

  const toggleAddon = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      addonIds: prev.addonIds.includes(id)
        ? prev.addonIds.filter((item) => item !== id)
        : [...prev.addonIds, id],
    }));
  };

  const toggleVeggieNote = (note: string) => {
    setConfig((prev) => ({
      ...prev,
      veggieNotes: prev.veggieNotes.includes(note)
        ? prev.veggieNotes.filter((item) => item !== note)
        : [...prev.veggieNotes, note],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmAdd({
      memberName: memberName.trim() || `ลูกค้า${tableLabel}`,
      department: tableLabel,
      config: {
        ...config,
        addonIds: [...config.addonIds],
        veggieNotes: [...config.veggieNotes],
        customNote: config.customNote.trim(),
      },
      quantity,
      unitPrice,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-dish-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/65 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#E7E2D8] bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Top Hero Image Header */}
        <div className="relative h-44 shrink-0 overflow-hidden bg-zinc-900 sm:h-52">
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเลือกออปชันเมนู"
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md backdrop-blur-xs hover:bg-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute right-4 bottom-3 left-4 flex items-end justify-between gap-3 text-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {dish.tag}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-zinc-100">
                  <Clock className="h-3 w-3" />
                  ~{dish.prepMinutes} นาที
                </span>
              </div>
              <h2
                id="customizer-dish-title"
                className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl"
              >
                {dish.name}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[11px] text-zinc-200">ราคาจานนี้</span>
              <p className="font-mono-num text-2xl font-extrabold text-amber-300">
                {unitPrice}฿
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Customizer Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* 1. Meat / Protein */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">1. เลือกเนื้อสัตว์</h3>
              <span className="rounded bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                จำเป็น
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEAT_OPTIONS.map((meat) => {
                const selected = config.meatId === meat.id;
                return (
                  <button
                    key={meat.id}
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, meatId: meat.id }))}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600'
                        : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-xs font-semibold text-zinc-900 sm:text-sm">
                      {meat.name}
                    </span>
                    <span className="font-mono-num shrink-0 pl-1 text-xs font-semibold text-zinc-500">
                      {meat.priceDelta > 0 ? `+${meat.priceDelta}฿` : 'ปกติ'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Dish Format & Portion */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">2. รูปแบบจาน</h3>
              <div className="mt-2 space-y-2">
                {DISH_FORMATS.map((fmt) => {
                  const selected = config.format === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() =>
                        setConfig((p) => ({ ...p, format: fmt.id as DishFormat }))
                      }
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left cursor-pointer ${
                        selected
                          ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600'
                          : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-zinc-900 sm:text-sm">
                        {fmt.label}
                      </span>
                      <span className="font-mono-num text-xs font-semibold text-zinc-600">
                        {fmt.priceDelta > 0 ? `+${fmt.priceDelta}฿` : 'ปกติ'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900">3. ขนาด / ปริมาณ</h3>
              <div className="mt-2 space-y-2">
                {PORTION_OPTIONS.map((p) => {
                  const selected = config.portion === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          portion: p.id as PortionSize,
                        }))
                      }
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left cursor-pointer ${
                        selected
                          ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600'
                          : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-zinc-900 sm:text-sm">
                        {p.label}
                      </span>
                      <span className="font-mono-num text-xs font-semibold text-zinc-600">
                        {p.priceDelta > 0 ? `+${p.priceDelta}฿` : 'ปกติ'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Spice Level */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900">4. ระดับความเผ็ด</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SPICE_LEVELS.map((spice) => {
                const selected = config.spice === spice.id;
                return (
                  <button
                    key={spice.id}
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({ ...p, spice: spice.id as SpiceLevel }))
                    }
                    className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all cursor-pointer ${
                      selected
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex h-4 items-center gap-0.5">
                      {spice.chilis === 0 ? (
                        <span className="text-xs font-medium">—</span>
                      ) : (
                        Array.from({ length: spice.chilis }).map((_, idx) => (
                          <Flame
                            key={idx}
                            className={`h-3.5 w-3.5 ${
                              selected ? 'text-amber-200' : 'text-orange-500'
                            }`}
                          />
                        ))
                      )}
                    </div>
                    <span className="mt-1 text-xs font-semibold">
                      {spice.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Add-on Eggs & Toppings */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              5. เพิ่มไข่ & ท็อปปิ้ง (เลือกได้หลายอย่าง)
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ADDON_OPTIONS.map((addon) => {
                const selected = config.addonIds.includes(addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left cursor-pointer ${
                      selected
                        ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-500'
                        : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate text-xs font-semibold text-zinc-800">
                        {addon.name}
                      </span>
                    </div>
                    <span className="font-mono-num shrink-0 pl-1 text-xs font-bold text-amber-700">
                      +{addon.price}฿
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Veggies, Custom Note & Who is ordering */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">
              6. คำขอพิเศษถึงครัว & ชื่อผู้สั่ง (สำหรับแยกบิลในโต๊ะ)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {VEGGIE_PREFS.map((note) => {
                const selected = config.veggieNotes.includes(note);
                return (
                  <button
                    key={note}
                    type="button"
                    onClick={() => toggleVeggieNote(note)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-600'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-emerald-600" />}
                    <span>{note}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="ชื่อผู้สั่ง (เช่น คุณไลท์, คุณเมย์)"
                aria-label="ชื่อผู้สั่ง"
                className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
              <input
                type="text"
                value={config.customNote}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, customNote: e.target.value }))
                }
                placeholder="โน้ตเพิ่มเติมถึงแม่ค้า..."
                aria-label="โน้ตเพิ่มเติมถึงแม่ค้า"
                className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="border-t border-[#E7E2D8] bg-[#FAF8F5] px-4 py-3.5 sm:px-6">
          <p className="mb-2.5 truncate text-xs font-semibold text-zinc-600">
            สรุปรายการ: <span className="text-zinc-900">{previewName}</span>
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-xl border border-[#E7E2D8] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="ลดจำนวน"
                className="flex h-11 w-10 items-center justify-center text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-mono-num w-8 text-center text-sm font-bold text-zinc-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                aria-label="เพิ่มจำนวน"
                className="flex h-11 w-10 items-center justify-center text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-700 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>เพิ่มลงตะกร้า ({lineTotal.toLocaleString('th-TH')}฿)</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
