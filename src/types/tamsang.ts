export type DishFormat = 'rice' | 'side' | 'noodle';

export type PortionSize = 'regular' | 'special' | 'jumbo';

export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'fire';

export type SplitMode = 'equal_delivery' | 'proportional';

export type MenuCategory = 'all' | 'stir_fry' | 'noodle' | 'rice_special' | 'spicy_herb';

export type OrderChannel = 'dine_in' | 'takeaway' | 'delivery';

export type KitchenStatus = 'queued' | 'cooking' | 'ready' | 'served';

export type PaymentStatus = 'unpaid' | 'paid';

export type PaymentMethod = 'promptpay' | 'cash';

export interface CustomDishConfig {
  format: DishFormat;
  baseId: string;
  meatId: string;
  spice: SpiceLevel;
  portion: PortionSize;
  addonIds: string[];
  veggieNotes: string[];
  customNote: string;
}

export interface OrderItem {
  id: string;
  memberName: string;
  department: string;
  config: CustomDishConfig;
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

export interface PartyRoom {
  id: string;
  roomCode: string;
  title: string;
  shopName: string;
  hostName: string;
  promptPayId: string;
  status: 'open' | 'locked';
  deliveryFee: number;
  discountAmount: number;
  splitMode: SplitMode;
  orders: OrderItem[];
  paidMembers: string[];
}

export interface RestaurantTicket {
  id: string;
  queueNumber: string;
  channel: OrderChannel;
  tableNumber: string;
  customerNote: string;
  kitchenStatus: KitchenStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  items: OrderItem[];
  deliveryFee: number;
  discountAmount: number;
  paidMembers: string[];
  createdAt: string;
}

export interface RestaurantState {
  shopName: string;
  branchName: string;
  hostName: string;
  promptPayId: string;
  tableCount: number;
  nextQueueSeq: number;
  tickets: RestaurantTicket[];
}

export interface FormatOption {
  id: DishFormat;
  label: string;
  shortLabel: string;
  description: string;
  priceDelta: number;
}

export interface PortionOption {
  id: PortionSize;
  label: string;
  description: string;
  priceDelta: number;
}

export interface CookingBaseOption {
  id: string;
  name: string;
  shortName: string;
  tag: string;
  basePrice: number;
  imageUrl: string;
  category: Exclude<MenuCategory, 'all'>;
  prepMinutes: number;
  recommendedFormats: DishFormat[];
  noodlePrefix?: string;
}

export interface MeatOption {
  id: string;
  name: string;
  category: 'pork' | 'poultry' | 'beef' | 'seafood' | 'plant';
  priceDelta: number;
}

export interface SpiceOption {
  id: SpiceLevel;
  label: string;
  shortLabel: string;
  chilis: number;
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  group: 'egg' | 'extra';
}

export interface QuickPreset {
  id: string;
  title: string;
  badge: string;
  imageUrl: string;
  config: CustomDishConfig;
}

export interface ColleaguePreset {
  name: string;
  department: string;
  initials: string;
}

export interface AggregatedDish {
  signature: string;
  fullName: string;
  baseName: string;
  formatLabel: string;
  portionLabel: string;
  spiceLabel: string;
  spiceLevel: SpiceLevel;
  addonNames: string[];
  veggieNotes: string[];
  customNote: string;
  unitPrice: number;
  totalQuantity: number;
  totalAmount: number;
  orderedBy: Array<{ memberName: string; quantity: number }>;
}

export interface AddonSummaryItem {
  id: string;
  name: string;
  count: number;
}

export interface KitchenSummary {
  dishes: AggregatedDish[];
  totalBoxes: number;
  totalFoodAmount: number;
  addonSummary: AddonSummaryItem[];
}

export interface MemberBillSplit {
  memberName: string;
  department: string;
  itemCount: number;
  itemsSummary: Array<{ id: string; fullName: string; quantity: number; lineTotal: number }>;
  foodSubtotal: number;
  deliveryShare: number;
  discountShare: number;
  netPayable: number;
  netPayableRounded: number;
  isPaid: boolean;
}

export interface BillSplitReport {
  members: MemberBillSplit[];
  totalFood: number;
  totalDelivery: number;
  totalDiscount: number;
  totalNet: number;
  totalCollected: number;
  totalPending: number;
  paidCount: number;
  memberCount: number;
}
