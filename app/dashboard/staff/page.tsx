"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, formatDateTime } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "VENDOR" | "MANAGER";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Shift {
  id: string;
  tenantId: string;
  userId: string;
  status: "ACTIVE" | "COMPLETED";
  clockIn: string;
  clockOut: string | null;
  breakMins: number;
  notes: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar: string | null;
    phone: string | null;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<Role, string> = {
  VENDOR: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  MANAGER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function computeShiftHours(clockIn: string, clockOut: string | null, breakMins: number): string {
  if (!clockOut) return "--";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const totalMins = Math.floor(ms / 60000) - breakMins;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${mins}m`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("team");

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MANAGER" as Role,
    phone: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "MANAGER" as Role,
    phone: "",
  });

  // Timer for active shift durations
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  }, []);

  const fetchActiveShifts = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts");
      if (res.ok) {
        const data = await res.json();
        setActiveShifts(data);
      }
    } catch (err) {
      console.error("Failed to fetch active shifts:", err);
    }
  }, []);

  const fetchShiftHistory = useCallback(async () => {
    try {
      // Fetch recent completed shifts for all staff
      const staffList = staff.length > 0 ? staff : [];
      const allShifts: Shift[] = [];

      for (const member of staffList.slice(0, 20)) {
        const res = await fetch(`/api/staff/${member.id}/shifts?limit=10`);
        if (res.ok) {
          const data = await res.json();
          const enriched = data.shifts.map((s: Shift) => ({
            ...s,
            user: {
              id: member.id,
              name: member.name,
              email: member.email,
              role: member.role,
              avatar: member.avatar,
              phone: member.phone,
            },
          }));
          allShifts.push(...enriched);
        }
      }

      allShifts.sort(
        (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
      );
      setShiftHistory(allShifts.slice(0, 50));
    } catch (err) {
      console.error("Failed to fetch shift history:", err);
    }
  }, [staff]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchStaff();
      await fetchActiveShifts();
      setLoading(false);
    }
    init();
  }, [fetchStaff, fetchActiveShifts]);

  useEffect(() => {
    if (tab === "shifts" && staff.length > 0) {
      fetchShiftHistory();
    }
  }, [tab, staff, fetchShiftHistory]);

  // Live timer for active shifts
  useEffect(() => {
    if (tab === "shifts" && activeShifts.length > 0) {
      timerRef.current = setInterval(() => setTick((t) => t + 1), 30000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tab, activeShifts.length]);

  // ─── Actions ────────────────────────────────────────────────────────────

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddForm({ name: "", email: "", password: "", role: "MANAGER", phone: "" });
        await fetchStaff();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add staff member");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add staff member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${editStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditOpen(false);
        setEditStaff(null);
        await fetchStaff();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update staff member");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update staff member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchStaff();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to deactivate staff member");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClockIn(userId: string) {
    try {
      const res = await fetch(`/api/staff/${userId}/shifts`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchActiveShifts();
        if (staff.length > 0) await fetchShiftHistory();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to clock in");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClockOut(userId: string) {
    try {
      const res = await fetch(`/api/staff/${userId}/shifts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchActiveShifts();
        if (staff.length > 0) await fetchShiftHistory();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to clock out");
      }
    } catch (err) {
      console.error(err);
    }
  }

  function openEdit(member: StaffMember) {
    setEditStaff(member);
    setEditForm({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || "",
    });
    setEditOpen(true);
  }

  // ─── Derived State ─────────────────────────────────────────────────────

  const activeShiftUserIds = useMemo(
    () => new Set(activeShifts.map((s) => s.userId)),
    [activeShifts]
  );

  const activeStaff = useMemo(
    () => staff.filter((s) => s.isActive),
    [staff]
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading staff...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and track shifts
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>

        {/* ─── Team Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddOpen(true)}>Add Staff</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {member.avatar && (
                            <AvatarImage src={member.avatar} alt={member.name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("font-medium", ROLE_COLORS[member.role])}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.phone || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.isActive ? "default" : "destructive"}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.lastLoginAt
                        ? formatDateTime(member.lastLoginAt)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(member)}
                        >
                          Edit
                        </Button>
                        {member.isActive && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivate(member.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {staff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No staff members found. Add your first team member to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Shifts Tab ────────────────────────────────────────────────── */}
        <TabsContent value="shifts" className="space-y-6">
          {/* Active Shifts */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Currently Clocked In</h2>
            {activeShifts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No one is currently clocked in.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeShifts.map((shift) => (
                  <Card key={shift.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {shift.user?.avatar && (
                              <AvatarImage
                                src={shift.user.avatar}
                                alt={shift.user?.name}
                              />
                            )}
                            <AvatarFallback>
                              {shift.user
                                ? getInitials(shift.user.name)
                                : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {shift.user?.name || "Unknown"}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                shift.user
                                  ? ROLE_COLORS[shift.user.role]
                                  : ""
                              )}
                            >
                              {shift.user?.role || "--"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClockOut(shift.userId)}
                        >
                          Clock Out
                        </Button>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Clocked in: {formatDateTime(shift.clockIn)}
                        </span>
                        <span className="font-mono font-medium">
                          {formatDuration(shift.clockIn)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Clock In Controls */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Clock In</h2>
            <div className="flex flex-wrap gap-2">
              {activeStaff
                .filter((s) => !activeShiftUserIds.has(s.id))
                .map((member) => (
                  <Button
                    key={member.id}
                    variant="outline"
                    onClick={() => handleClockIn(member.id)}
                  >
                    Clock In {member.name}
                  </Button>
                ))}
              {activeStaff.filter((s) => !activeShiftUserIds.has(s.id))
                .length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All active staff are currently clocked in.
                </p>
              )}
            </div>
          </div>

          {/* Shift History */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Shift History</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Break (mins)</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftHistory.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">
                        {shift.user?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{formatDateTime(shift.clockIn)}</TableCell>
                      <TableCell>
                        {shift.clockOut
                          ? formatDateTime(shift.clockOut)
                          : "--"}
                      </TableCell>
                      <TableCell>{shift.breakMins}</TableCell>
                      <TableCell className="font-mono">
                        {computeShiftHours(
                          shift.clockIn,
                          shift.clockOut,
                          shift.breakMins
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            shift.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {shift.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {shiftHistory.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No shift history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Add Staff Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new team member account. They will be able to log in with
              the credentials you provide.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="john@restaurant.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) =>
                  setAddForm((f) => ({ ...f, role: v as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone (optional)</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Staff Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, role: v as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
