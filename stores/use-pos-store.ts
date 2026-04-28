import { create } from "zustand";

export type CartItem = {
  productId: string;
  productName: string;
  priceCents: number;
  qty: number;
  notes?: string;
};

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type PaymentMethod = "CASH" | "CARD" | "UPI";

interface PosState {
  // Cart
  items: CartItem[];
  orderType: OrderType;
  tableId: string | null;
  tableNumber: number | null;
  customerId: string | null;
  notes: string;

  // Discount & Payment
  discountPercent: number;
  paymentMethod: PaymentMethod;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setOrderType: (orderType: OrderType) => void;
  setTableId: (tableId: string | null, tableNumber?: number | null) => void;
  setCustomerId: (customerId: string | null) => void;
  setNotes: (notes: string) => void;
  setDiscountPercent: (percent: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;

  // Computed
  get subtotalCents(): number;
  get itemCount(): number;
}

export const usePosStore = create<PosState>()((set, get) => ({
  items: [],
  orderType: "DINE_IN",
  tableId: null,
  tableNumber: null,
  customerId: null,
  notes: "",
  discountPercent: 0,
  paymentMethod: "CASH",

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQty: (productId, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, qty } : i
        ),
      };
    }),

  clearCart: () =>
    set({
      items: [],
      orderType: "DINE_IN",
      tableId: null,
      tableNumber: null,
      customerId: null,
      notes: "",
      discountPercent: 0,
      paymentMethod: "CASH",
    }),

  setOrderType: (orderType) => set({ orderType }),
  setTableId: (tableId, tableNumber = null) => set({ tableId, tableNumber }),
  setCustomerId: (customerId) => set({ customerId }),
  setNotes: (notes) => set({ notes }),
  setDiscountPercent: (percent) => set({ discountPercent: Math.max(0, Math.min(100, percent)) }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  get subtotalCents() {
    return get().items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  },

  get itemCount() {
    return get().items.reduce((sum, i) => sum + i.qty, 0);
  },
}));
