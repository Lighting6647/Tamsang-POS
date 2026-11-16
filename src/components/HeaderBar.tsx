import {
  BellRing,
  ClipboardCopy,
  Flame,
  QrCode,
  Receipt,
  Settings,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { RestaurantState } from '../types/tamsang.ts';
import { getRestaurantStats } from '../utils/restaurant.ts';

interface HeaderBarProps {
  state: RestaurantState;
  activeTableQuery: string | null;
  onClearTableQuery: () => void;
  onOpenTableQr: () => void;
  onCopyKitchenSummary: () => void;
  onOpenSettings: () => void;
}

export function HeaderBar({
  state,
  activeTableQuery,
  onClearTableQuery,
  onOpenTableQr,
  onCopyKitchenSummary,
  onOpenSettings,
}: HeaderBarProps) {
  const stats = getRestaurantStats(state.tickets);

  return (
    <header className="border-b border-[#E7E2D8] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Top Row: Restaurant Brand & Action Buttons */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
                  Tamsang POS · ร้านอาหารตามสั่งครบวงจร
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  เปิดร้านรับออเดอร์
                </span>
                {activeTableQuery && (
                  <button
                    type="button"
                    onClick={onClearTableQuery}
                    title="คลิกเพื่อออกจากโหมดสแกนโต๊ะ"
                    className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800 ring-1 ring-orange-300 hover:bg-orange-200 cursor-pointer"
                  >
                    <span>โหมดลูกค้าสแกน: {activeTableQuery}</span>
                    <span className="text-[10px]">✕</span>
                  </button>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-zinc-600">
                <span className="font-semibold text-zinc-800">{state.shopName}</span>
                <span className="mx-2 text-zinc-300">|</span>
                <span>{state.branchName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenTableQr}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-orange-400" />
              <span>QR สั่งอาหารประจำโต๊ะ</span>
            </button>

            <button
              type="button"
              onClick={onCopyKitchenSummary}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#FAF8F5] hover:text-zinc-900 cursor-pointer"
            >
              <ClipboardCopy className="h-4 w-4 text-orange-600" />
              <span>คัดลอกใบสรุปครัว</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#EFECE4] hover:text-zinc-900 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>ตั้งค่าร้าน</span>
            </button>
          </div>
        </div>

        {/* Live Restaurant KPI Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>ออเดอร์รอเช็คบิล</span>
              <Receipt className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <p className="font-mono-num mt-1 text-lg font-bold text-zinc-900">
              {stats.unpaidCount}{' '}
              <span className="text-xs font-normal text-zinc-500">บิล</span>
            </p>
          </div>

          <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>คิวรอผัดในครัว</span>
              <Flame className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <p className="font-mono-num mt-1 text-lg font-bold text-orange-700">
              {stats.activeKitchenCount}{' '}
              <span className="text-xs font-normal text-zinc-500">
                คิว ({stats.activeKitchenBoxes} จาน)
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>พร้อมเสิร์ฟหน้าเตา</span>
              <BellRing className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="font-mono-num mt-1 text-lg font-bold text-amber-700">
              {stats.readyCount}{' '}
              <span className="text-xs font-normal text-zinc-500">คิว</span>
            </p>
          </div>

          <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>ยอดขายวันนี้</span>
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="font-mono-num mt-1 text-lg font-bold text-emerald-700">
              {stats.totalRevenueToday.toLocaleString('th-TH')}{' '}
              <span className="text-xs font-normal text-zinc-500">฿</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
