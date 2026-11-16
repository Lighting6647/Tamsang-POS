import {
  ADDON_OPTIONS,
  COOKING_BASES,
  DISH_FORMATS,
  MEAT_OPTIONS,
  PORTION_OPTIONS,
  SPICE_LEVELS,
} from '../data/presets.ts';
import type { CustomDishConfig } from '../types/tamsang.ts';

export function calculateDishUnitPrice(config: CustomDishConfig): number {
  const base = COOKING_BASES.find((b) => b.id === config.baseId);
  const meat = MEAT_OPTIONS.find((m) => m.id === config.meatId);
  const format = DISH_FORMATS.find((f) => f.id === config.format);
  const portion = PORTION_OPTIONS.find((p) => p.id === config.portion);

  const basePrice = base?.basePrice ?? 50;
  const meatDelta = meat?.priceDelta ?? 0;
  const formatDelta = format?.priceDelta ?? 0;
  const portionDelta = portion?.priceDelta ?? 0;

  const addonsSum = config.addonIds.reduce((sum, id) => {
    const addon = ADDON_OPTIONS.find((a) => a.id === id);
    return sum + (addon?.price ?? 0);
  }, 0);

  return basePrice + meatDelta + formatDelta + portionDelta + addonsSum;
}

export function getDishParts(config: CustomDishConfig) {
  const base = COOKING_BASES.find((b) => b.id === config.baseId);
  const meat = MEAT_OPTIONS.find((m) => m.id === config.meatId);
  const format = DISH_FORMATS.find((f) => f.id === config.format);
  const portion = PORTION_OPTIONS.find((p) => p.id === config.portion);
  const spice = SPICE_LEVELS.find((s) => s.id === config.spice);

  const addonNames = config.addonIds
    .map((id) => ADDON_OPTIONS.find((a) => a.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    baseName: base?.shortName ?? 'ตามสั่ง',
    baseFullName: base?.name ?? 'อาหารตามสั่ง',
    meatName: meat?.name ?? 'หมู',
    formatLabel: format?.shortLabel ?? 'ราดข้าว',
    portionLabel: portion?.label ?? 'ธรรมดา',
    spiceLabel: spice?.label ?? 'เผ็ดกลาง',
    spiceShortLabel: spice?.shortLabel ?? 'เผ็ดกลาง',
    addonNames,
  };
}

export function formatDishFullName(config: CustomDishConfig): string {
  const { baseName, meatName, formatLabel, portionLabel, spiceLabel, addonNames } =
    getDishParts(config);

  const mainTitle =
    config.format === 'noodle'
      ? `${baseName}${meatName}`
      : `${baseName}${meatName}`;

  const formatPortion =
    config.portion === 'regular'
      ? `(${formatLabel})`
      : `(${formatLabel}·${portionLabel})`;

  const addonsText = addonNames.length > 0 ? ` + ${addonNames.join(' + ')}` : '';

  const bracketItems: string[] = [spiceLabel];
  if (config.veggieNotes.length > 0) {
    bracketItems.push(...config.veggieNotes);
  }
  const trimmedNote = config.customNote.trim();
  if (trimmedNote) {
    bracketItems.push(trimmedNote);
  }

  return `${mainTitle} ${formatPortion}${addonsText} [${bracketItems.join(' · ')}]`;
}

export function getDishSignature(config: CustomDishConfig): string {
  const sortedAddons = [...config.addonIds].sort().join(',');
  const sortedNotes = [...config.veggieNotes].map((n) => n.trim()).sort().join(',');
  const normalizedCustom = config.customNote.trim().toLowerCase();

  return [
    config.format,
    config.baseId,
    config.meatId,
    config.spice,
    config.portion,
    sortedAddons,
    sortedNotes,
    normalizedCustom,
  ].join('|');
}
