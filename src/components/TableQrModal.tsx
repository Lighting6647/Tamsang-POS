import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, QrCode, X } from 'lucide-react';

interface TableQrModalProps {
  shopName: string;
  tableCount: number;
  onClose: () => void;
  onSelectTablePreview: (tableNumber: string) => void;
}

export function TableQrModal({
  shopName,
  tableCount,
  onClose,
  onSelectTablePreview,
}: TableQrModalProps) {
  const [selectedTable, setSelectedTable] = useState(1);
  const [qrUrl, setQrUrl] = useState('');

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const targetUrl = `${origin}/?table=${selectedTable}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#18181B', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [targetUrl]);

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E7E2D8] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E7E2D8] px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-orange-600" />
            <div>
              <h2 id="table-qr-title" className="text-base font-bold text-zinc-900">
                QR Code สำหรับวางบนโต๊ะให้ลูกค้าสแกนสั่ง
              </h2>
              <p className="text-xs text-zinc-500">{shopName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง QR โต๊ะ"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold text-zinc-700">เลือกหมายเลขโต๊ะ</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {tables.map((t) => {
              const active = selectedTable === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTable(t)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'border-orange-600 bg-orange-600 text-white'
                      : 'border-[#E7E2D8] bg-[#FAF8F5] text-zinc-700 hover:border-orange-300'
                  }`}
                >
                  โต๊ะ {t}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col items-center rounded-2xl border border-[#E7E2D8] bg-[#FAF8F5] p-5 text-center">
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">
              โต๊ะ {selectedTable} · สแกนเพื่อสั่งอาหาร
            </span>
            <div className="mt-3 rounded-2xl border border-[#E7E2D8] bg-white p-3">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR Code สำหรับโต๊ะ ${selectedTable}`}
                  className="h-48 w-48 object-contain"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-xs text-zinc-400">
                  กำลังสร้าง QR...
                </div>
              )}
            </div>
            <p className="font-mono-num mt-3 max-w-full truncate text-xs text-zinc-500">
              {targetUrl}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] flex-1 rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-[#FAF8F5] cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTablePreview(`โต๊ะ ${selectedTable}`);
                onClose();
              }}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>จำลองลูกค้าโต๊ะ {selectedTable} สั่ง</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
