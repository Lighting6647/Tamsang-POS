/**
 * EMVCo QR PromptPay payload generator (Thailand PromptPay specification).
 * Supports 10-digit mobile numbers, 13-digit National/Tax IDs, and 15-digit e-Wallet IDs.
 */

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function sanitizePromptPayId(rawId: string): string {
  return rawId.replace(/[^0-9]/g, '');
}

export function isValidPromptPayId(rawId: string): boolean {
  const digits = sanitizePromptPayId(rawId);
  return (
    (digits.length === 10 && digits.startsWith('0')) ||
    digits.length === 13 ||
    digits.length === 15
  );
}

export function formatPromptPayDisplay(rawId: string): string {
  const digits = sanitizePromptPayId(rawId);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }
  return digits || 'ยังไม่ระบุ';
}

function encodePromptPayTarget(rawId: string): string {
  const digits = sanitizePromptPayId(rawId);

  if (digits.length === 10 && digits.startsWith('0')) {
    const intlPhone = `0066${digits.slice(1)}`;
    return formatTlv('01', intlPhone);
  }
  if (digits.length === 13) {
    return formatTlv('02', digits);
  }
  if (digits.length === 15) {
    return formatTlv('03', digits);
  }

  throw new Error(
    'เลข PromptPay ไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน/นิติบุคคล 13 หลัก',
  );
}

export function generatePromptPayPayload(promptPayId: string, amount?: number): string {
  const hasAmount = typeof amount === 'number' && Number.isFinite(amount) && amount > 0;

  const merchantAccountSubTags =
    formatTlv('00', 'A000000677010111') + encodePromptPayTarget(promptPayId);

  const segments: string[] = [
    formatTlv('00', '01'), // Payload Format Indicator
    formatTlv('01', hasAmount ? '12' : '11'), // 12 = Dynamic QR with amount, 11 = Static
    formatTlv('29', merchantAccountSubTags), // Merchant Account Information (PromptPay)
    formatTlv('53', '764'), // THB Currency Code
  ];

  if (hasAmount && amount !== undefined) {
    segments.push(formatTlv('54', amount.toFixed(2)));
  }

  segments.push(formatTlv('58', 'TH')); // Country Code

  const payloadWithoutCrc = `${segments.join('')}6304`;
  const checksum = crc16CcittFalse(payloadWithoutCrc);
  return `${payloadWithoutCrc}${checksum}`;
}
