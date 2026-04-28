"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useKdsStore } from "@/stores/use-kds-store";
import type { KdsTicket, KdsFilter } from "@/stores/use-kds-store";
import { cn } from "@/lib/utils";
import {
  Clock,
  Flame,
  ChefHat,
  CheckCircle2,
  UtensilsCrossed,
  Coffee,
  Truck,
  Bell,
  Maximize,
  AlertTriangle,
  Timer,
  Hash,
  ArrowRight,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SOCKET_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001")
    : "http://localhost:4001";

const OVERDUE_MINS = 12;
const URGENT_MINS = 8;

const FILTER_OPTIONS: { value: KdsFilter; label: string; icon: typeof Hash }[] = [
  { value: "ALL", label: "All", icon: Hash },
  { value: "DINE_IN", label: "Dine In", icon: UtensilsCrossed },
  { value: "TAKEAWAY", label: "Takeaway", icon: Coffee },
  { value: "DELIVERY", label: "Delivery", icon: Truck },
];

// ─── Time helpers ────────────────────────────────────────────────────────────

function getElapsedMins(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function formatElapsed(iso: string): string {
  const mins = getElapsedMins(iso);
  if (mins < 1) return "0:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(0).padStart(2, "0")}`;
}

function getTimerColor(iso: string): string {
  const mins = getElapsedMins(iso);
  if (mins >= OVERDUE_MINS) return "text-red-400";
  if (mins >= URGENT_MINS) return "text-amber-400";
  return "text-gray-400";
}

// ─── Ticket Card ─────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onAction,
  loadingId,
}: {
  ticket: KdsTicket;
  onAction: (id: string, status: string) => void;
  loadingId: string | null;
}) {
  const [elapsed, setElapsed] = useState(formatElapsed(ticket.createdAt));
  const mins = getElapsedMins(ticket.createdAt);
  const isOverdue = mins >= OVERDUE_MINS;
  const isUrgent = mins >= URGENT_MINS;
  const isLoading = loadingId === ticket.id;

  // Per-card timer refresh
  useEffect(() => {
    setElapsed(formatElapsed(ticket.createdAt));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(ticket.createdAt));
    }, 10_000);
    return () => clearInterval(interval);
  }, [ticket.createdAt]);

  const orderTypeLabel =
    ticket.orderType === "DINE_IN"
      ? "Dine In"
      : ticket.orderType === "TAKEAWAY"
        ? "Takeaway"
        : ticket.orderType === "DELIVERY"
          ? "Delivery"
          : ticket.orderType;

  const OrderTypeIcon =
    ticket.orderType === "TAKEAWAY"
      ? Coffee
      : ticket.orderType === "DELIVERY"
        ? Truck
        : UtensilsCrossed;

  // Color scheme per status
  const statusStyles: Record<string, { border: string; bg: string; glow: string }> = {
    PENDING: {
      border: "border-l-sky-500",
      bg: "bg-sky-500/5",
      glow: isOverdue ? "ring-2 ring-red-500/60 animate-pulse" : "",
    },
    CONFIRMED: {
      border: "border-l-sky-500",
      bg: "bg-sky-500/5",
      glow: isOverdue ? "ring-2 ring-red-500/60 animate-pulse" : "",
    },
    PREPARING: {
      border: "border-l-amber-500",
      bg: "bg-amber-500/5",
      glow: isOverdue ? "ring-2 ring-red-500/60 animate-pulse" : "",
    },
    READY: {
      border: "border-l-emerald-500",
      bg: "bg-emerald-500/5",
      glow: "",
    },
  };

  const style = statusStyles[ticket.status] || statusStyles.PENDING;

  // Action button config
  let actionLabel = "";
  let actionColor = "";
  let nextStatus = "";

  if (ticket.status === "PENDING" || ticket.status === "CONFIRMED") {
    actionLabel = "Start Cooking";
    actionColor = "bg-amber-500 hover:bg-amber-600 active:bg-amber-700";
    nextStatus = "PREPARING";
  } else if (ticket.status === "PREPARING") {
    actionLabel = "Mark Ready";
    actionColor = "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700";
    nextStatus = "READY";
  } else if (ticket.status === "READY") {
    actionLabel = "Served";
    actionColor = "bg-gray-600 hover:bg-gray-500 active:bg-gray-400";
    nextStatus = "SERVED";
  }

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 transition-all",
        style.border,
        style.bg,
        style.glow,
        "bg-gray-800/80 ring-1 ring-gray-700/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white">#{ticket.orderNumber}</span>
          {ticket.priority > 0 && (
            <span className="flex items-center gap-0.5 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/30">
              <Flame className="h-3 w-3" /> RUSH
            </span>
          )}
        </div>
        <div className={cn("flex items-center gap-1 text-lg font-mono font-bold", getTimerColor(ticket.createdAt))}>
          <Timer className="h-4 w-4" />
          {elapsed}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 px-4 pb-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <OrderTypeIcon className="h-3 w-3" />
          {orderTypeLabel}
        </span>
        {ticket.tableNumber != null && (
          <span className="font-semibold text-gray-300">Table {ticket.tableNumber}</span>
        )}
        {isOverdue && (
          <span className="flex items-center gap-0.5 text-red-400 font-bold ml-auto">
            <AlertTriangle className="h-3 w-3" /> OVERDUE
          </span>
        )}
        {!isOverdue && isUrgent && (
          <span className="flex items-center gap-0.5 text-amber-400 font-semibold ml-auto">
            <Clock className="h-3 w-3" /> Hurry
          </span>
        )}
      </div>

      {/* Items */}
      <div className="border-t border-gray-700/50 px-4 py-3 space-y-1.5">
        {ticket.items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-start gap-3">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-700 text-xs font-black text-white">
              {item.qty}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 leading-tight">{item.productName}</p>
              {item.notes && (
                <p className="text-[11px] text-amber-400/80 italic mt-0.5">{item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Order notes */}
      {ticket.notes && (
        <div className="border-t border-gray-700/50 px-4 py-2">
          <p className="text-[11px] text-gray-500 italic">{ticket.notes}</p>
        </div>
      )}

      {/* Action button */}
      {nextStatus && (
        <div className="border-t border-gray-700/50 p-3">
          <button
            onClick={() => onAction(ticket.id, nextStatus)}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-extrabold text-white transition-all active:scale-[0.97]",
              actionColor,
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="animate-pulse">Updating...</span>
            ) : (
              <>
                {ticket.status === "PENDING" || ticket.status === "CONFIRMED" ? (
                  <ChefHat className="h-4 w-4" />
                ) : ticket.status === "PREPARING" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {actionLabel}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function KdsColumn({
  title,
  icon: Icon,
  tickets,
  color,
  headerBg,
  onAction,
  loadingId,
}: {
  title: string;
  icon: typeof Clock;
  tickets: KdsTicket[];
  color: string;
  headerBg: string;
  onAction: (id: string, status: string) => void;
  loadingId: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col min-w-[340px]">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 rounded-xl px-4 py-3 mb-4", headerBg)}>
        <Icon className={cn("h-5 w-5", color)} />
        <h2 className={cn("text-base font-bold", color)}>{title}</h2>
        <span className={cn(
          "ml-auto flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-black",
          tickets.length > 0 ? `${headerBg} ${color} ring-1 ring-current/20` : "text-gray-600"
        )}>
          {tickets.length}
        </span>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-700">
            <Icon className="h-10 w-10 mb-2" />
            <p className="text-sm font-medium">No orders</p>
          </div>
        ) : (
          tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} onAction={onAction} loadingId={loadingId} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main KDS Page ───────────────────────────────────────────────────────────

export default function KdsPage() {
  const { tickets, filter, setTickets, addTicket, updateTicketStatus, removeTicket, setFilter } =
    useKdsStore();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(Date.now());
  const socketRef = useRef<Socket | null>(null);

  // Clock refresh for header
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/kds");
        if (res.ok) {
          const data = await res.json();
          const mapped: KdsTicket[] = (Array.isArray(data) ? data : data.data || []).map((t: Record<string, unknown>) => ({
            id: t.id as string,
            orderId: (t.orderId || "") as string,
            orderNumber: (t.orderNumber || 0) as number,
            orderType: (t.orderType || "DINE_IN") as string,
            status: (t.status || "PENDING") as string,
            priority: (t.priority || 0) as number,
            tableNumber: (t.tableNumber ?? null) as number | null,
            notes: (t.notes ?? null) as string | null,
            items: ((t.items || []) as Array<Record<string, unknown>>).map((i) => ({
              id: i.id as string | undefined,
              productName: (i.productName || "") as string,
              qty: (i.qty || 1) as number,
              notes: (i.notes ?? null) as string | null,
            })),
            createdAt: (t.createdAt || new Date().toISOString()) as string,
            startedAt: (t.startedAt ?? null) as string | null,
            completedAt: (t.completedAt ?? null) as string | null,
          }));
          setTickets(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch KDS tickets", err);
      }
    }
    load();
  }, [setTickets]);

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const tenantId =
        document.querySelector('meta[name="tenant-id"]')?.getAttribute("content") ?? "";
      if (tenantId) {
        socket.emit("join-tenant", tenantId);
      }
    });

    socket.on("kds:new-order", (payload: Record<string, unknown>) => {
      const ticket = mapPayloadToTicket(payload);
      if (ticket) {
        addTicket(ticket);
        setFlash(true);
        setTimeout(() => setFlash(false), 2000);
        // Audio notification
        try {
          const audio = new Audio("/sounds/new-order.mp3");
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch {
          // Audio not available
        }
      }
    });

    socket.on("kds:update", (payload: Record<string, unknown>) => {
      const status = payload.status as string;
      const id = payload.id as string;
      if (status === "SERVED" || status === "COMPLETED" || status === "CANCELLED") {
        removeTicket(id);
      } else {
        updateTicketStatus(id, status, {
          startedAt: (payload.startedAt ?? null) as string | null,
          completedAt: (payload.completedAt ?? null) as string | null,
        });
      }
    });

    socket.on("kds:order-served", (payload: Record<string, unknown>) => {
      removeTicket(payload.id as string);
    });

    return () => {
      socket.disconnect();
    };
  }, [addTicket, updateTicketStatus, removeTicket]);

  // ── Action handler ─────────────────────────────────────────────────────────
  const handleAction = useCallback(
    async (ticketId: string, newStatus: string) => {
      setLoadingId(ticketId);
      try {
        const res = await fetch(`/api/kds/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
          if (newStatus === "SERVED") {
            removeTicket(ticketId);
          } else {
            updateTicketStatus(ticketId, newStatus, {
              ...(newStatus === "PREPARING" ? { startedAt: new Date().toISOString() } : {}),
              ...(newStatus === "READY" ? { completedAt: new Date().toISOString() } : {}),
            });
          }
        } else {
          const data = await res.json().catch(() => ({}));
          console.error("KDS action failed:", (data as Record<string, unknown>).error ?? res.statusText);
        }
      } catch (err) {
        console.error("KDS action error:", err);
      } finally {
        setLoadingId(null);
      }
    },
    [updateTicketStatus, removeTicket]
  );

  // ── Filter tickets ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === "ALL") return tickets;
    return tickets.filter((t) => t.orderType === filter);
  }, [tickets, filter]);

  const newTickets = useMemo(
    () => filtered.filter((t) => t.status === "PENDING" || t.status === "CONFIRMED"),
    [filtered]
  );
  const preparingTickets = useMemo(
    () => filtered.filter((t) => t.status === "PREPARING"),
    [filtered]
  );
  const readyTickets = useMemo(
    () => filtered.filter((t) => t.status === "READY"),
    [filtered]
  );

  const totalActive = newTickets.length + preparingTickets.length + readyTickets.length;

  // Fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gray-950 text-white">
      {/* New order flash */}
      {flash && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-sky-500/10 animate-pulse" />
      )}

      {/* ═══ HEADER ═══ */}
      <header className="flex items-center gap-4 border-b border-gray-800 bg-gray-900 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20">
            <ChefHat className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight">Kitchen Display</h1>
            <p className="text-[10px] text-gray-500 font-mono">
              {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Order type filter */}
        <div className="flex items-center rounded-lg bg-gray-800 p-0.5 ml-6">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                filter === f.value
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <Stat label="New" count={newTickets.length} color="text-sky-400" dotColor="bg-sky-500" />
            <Stat label="Cooking" count={preparingTickets.length} color="text-amber-400" dotColor="bg-amber-500" />
            <Stat label="Ready" count={readyTickets.length} color="text-emerald-400" dotColor="bg-emerald-500" />
          </div>

          <div className="h-6 w-px bg-gray-700" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-400">Live</span>
          </div>

          <button
            onClick={handleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══ COLUMNS ═══ */}
      <main className="flex flex-1 gap-5 overflow-x-auto p-5">
        <KdsColumn
          title="New Orders"
          icon={Bell}
          tickets={newTickets}
          color="text-sky-400"
          headerBg="bg-sky-500/10"
          onAction={handleAction}
          loadingId={loadingId}
        />
        <KdsColumn
          title="Preparing"
          icon={Flame}
          tickets={preparingTickets}
          color="text-amber-400"
          headerBg="bg-amber-500/10"
          onAction={handleAction}
          loadingId={loadingId}
        />
        <KdsColumn
          title="Ready to Serve"
          icon={CheckCircle2}
          tickets={readyTickets}
          color="text-emerald-400"
          headerBg="bg-emerald-500/10"
          onAction={handleAction}
          loadingId={loadingId}
        />
      </main>

      {/* ═══ BOTTOM BAR ═══ */}
      {totalActive === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-700">
          <div className="text-center">
            <ChefHat className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold">No active orders</p>
            <p className="text-sm text-gray-600 mt-1">Waiting for new orders from POS...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stat({ label, count, color, dotColor }: { label: string; count: number; color: string; dotColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      <span className={cn("font-bold", color)}>{count}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapPayloadToTicket(payload: Record<string, unknown>): KdsTicket | null {
  if (!payload.id) return null;
  return {
    id: payload.id as string,
    orderId: (payload.orderId || "") as string,
    orderNumber: (payload.orderNumber || 0) as number,
    orderType: (payload.orderType || "DINE_IN") as string,
    status: (payload.status || "PENDING") as string,
    priority: (payload.priority || 0) as number,
    tableNumber: (payload.tableNumber ?? null) as number | null,
    notes: (payload.notes ?? null) as string | null,
    items: ((payload.items || []) as Array<Record<string, unknown>>).map((i) => ({
      id: i.id as string | undefined,
      productName: (i.productName || "") as string,
      qty: (i.qty || 1) as number,
      notes: (i.notes ?? null) as string | null,
    })),
    createdAt: (payload.createdAt || new Date().toISOString()) as string,
    startedAt: (payload.startedAt ?? null) as string | null,
    completedAt: (payload.completedAt ?? null) as string | null,
  };
}
