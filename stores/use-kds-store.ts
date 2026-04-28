import { create } from "zustand";

export type KdsTicketItem = {
  id?: string;
  productName: string;
  qty: number;
  notes?: string | null;
};

export type KdsTicket = {
  id: string;
  orderId: string;
  orderNumber: number;
  orderType: string;
  status: string;
  priority: number;
  tableNumber: number | null;
  notes: string | null;
  items: KdsTicketItem[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type KdsFilter = "ALL" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";

interface KdsState {
  tickets: KdsTicket[];
  filter: KdsFilter;

  setTickets: (tickets: KdsTicket[]) => void;
  addTicket: (ticket: KdsTicket) => void;
  updateTicketStatus: (ticketId: string, status: string, extra?: Partial<KdsTicket>) => void;
  removeTicket: (ticketId: string) => void;
  setFilter: (filter: KdsFilter) => void;
}

export const useKdsStore = create<KdsState>()((set) => ({
  tickets: [],
  filter: "ALL",

  setTickets: (tickets) => set({ tickets }),

  addTicket: (ticket) =>
    set((state) => {
      if (state.tickets.some((t) => t.id === ticket.id)) return state;
      return { tickets: [ticket, ...state.tickets] };
    }),

  updateTicketStatus: (ticketId, status, extra) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status, ...extra } : t
      ),
    })),

  removeTicket: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== ticketId),
    })),

  setFilter: (filter) => set({ filter }),
}));
