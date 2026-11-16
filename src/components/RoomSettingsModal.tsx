import { useState } from 'react';
import { RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { RestaurantState } from '../types/tamsang.ts';

interface RoomSettingsModalProps {
  state: RestaurantState;
  onClose: () => void;
  onSaveSettings: (
    updates: Pick<
      RestaurantState,
      'shopName' | 'branchName' | 'hostName' | 'promptPayId' | 'tableCount'
    >,
  ) => void;
  onResetDemo: () => void;
  onClearTickets: () => void;
}

export function RoomSettingsModal({
  state,
  onClose,
  onSaveSettings,
  onResetDemo,
  onClearTickets,
}: RoomSettingsModalProps) {
  const [shopName, setShopName] = useState(state.shopName);
  const [branchName, setBranchName] = useState(state.branchName);
  const [hostName, setHostName] = useState(state.hostName);
  const [promptPayId, setPromptPayId] = useState(state.promptPayId);
  const [tableCount, setTableCount] = useState(state.tableCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      shopName: shopName.trim() || state.shopName,
      branchName: branchName.trim() || state.branchName,
      hostName: hostName.trim() || state.hostName,
      promptPayId: promptPayId.trim() || state.promptPayId,
      tableCount: Math.max(1, Math.min(30, Number(tableCount) || 8)),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restaurant-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E7E2D8] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E7E2D8] px-5 py-4">
          <h2
            id="restaurant-settings-title"
            className="text-base font-bold text-zinc-900"
          >
            ตั้งค่าระบบร้านอาหารตามสั่ง (POS)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างตั้งค่าร้าน"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-xs font-bold text-zinc-700">
              ชื่อร้านอาหาร
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700">
              สาขา / คำอธิบายร้าน
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700">
                ชื่อผู้รับเงิน / เจ้าของร้าน
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700">
                จำนวนโต๊ะในร้าน
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value) || 8)}
                className="font-mono-num mt-1.5 w-full rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700">
              เลข PromptPay รับชำระเงินของร้าน
            </label>
            <input
              type="text"
              value={promptPayId}
              onChange={(e) => setPromptPayId(e.target.value)}
              className="font-mono-num mt-1.5 w-full rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EFECE4] pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-[#EFECE4] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>คืนค่าตัวอย่าง</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClearTickets();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>ล้างคิว & บิลทั้งหมด</span>
              </button>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
