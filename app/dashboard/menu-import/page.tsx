"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type MenuDiffItem = {
  name: string;
  priceCents: number;
  category: string;
  description: string;
  isVeg: boolean;
  isMeal: boolean;
  status: "new" | "updated" | "unchanged";
  existingProductId?: string;
  existingPriceCents?: number;
};

type MenuImportResponse = {
  items: MenuDiffItem[];
  summary: {
    total: number;
    new: number;
    updated: number;
    unchanged: number;
  };
};

// ─── Status Badge Colors ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  updated: "bg-yellow-100 text-yellow-800",
  unchanged: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  updated: "Price Changed",
  unchanged: "No Change",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MenuImportPage() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Parsed result state
  const [result, setResult] = useState<MenuImportResponse | null>(null);
  const [editedItems, setEditedItems] = useState<MenuDiffItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Confirm state
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{
    added: number;
    updated: number;
  } | null>(null);

  // ─── File Selection ─────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setFile(selected);
      setErrorMsg("");
      setResult(null);
      setConfirmResult(null);

      // Preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    },
    []
  );

  // ─── Scan Menu ──────────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    if (!file) return;

    setScanning(true);
    setErrorMsg("");
    setResult(null);
    setConfirmResult(null);

    try {
      const formData = new FormData();
      formData.append("menuImage", file);

      const res = await fetch("/api/menu-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to scan menu");
        return;
      }

      const response = data as MenuImportResponse;
      setResult(response);
      setEditedItems(response.items);

      // Auto-select new and updated items
      const autoSelected = new Set<number>();
      response.items.forEach((item, idx) => {
        if (item.status === "new" || item.status === "updated") {
          autoSelected.add(idx);
        }
      });
      setSelectedItems(autoSelected);
    } catch {
      setErrorMsg("Failed to scan menu. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [file]);

  // ─── Edit Item ──────────────────────────────────────────────────────────

  const updateItem = useCallback(
    (index: number, field: keyof MenuDiffItem, value: string | number | boolean) => {
      setEditedItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  // ─── Toggle Selection ───────────────────────────────────────────────────

  const toggleItem = useCallback((index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!editedItems.length) return;
    setSelectedItems((prev) => {
      const actionableIdxs = editedItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.status !== "unchanged")
        .map(({ idx }) => idx);

      const allSelected = actionableIdxs.every((idx) => prev.has(idx));
      if (allSelected) {
        return new Set<number>();
      }
      return new Set(actionableIdxs);
    });
  }, [editedItems]);

  // ─── Confirm Import ────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    const itemsToImport = editedItems.filter(
      (_, idx) => selectedItems.has(idx) && editedItems[idx].status !== "unchanged"
    );

    if (!itemsToImport.length) {
      setErrorMsg("No items selected for import");
      return;
    }

    setConfirming(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/menu-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToImport }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to import items");
        return;
      }

      setConfirmResult({ added: data.added, updated: data.updated });
      setResult(null);
      setEditedItems([]);
      setSelectedItems(new Set());
      setFile(null);
      setPreview(null);
    } catch {
      setErrorMsg("Failed to import items. Please try again.");
    } finally {
      setConfirming(false);
    }
  }, [editedItems, selectedItems]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const actionableCount = editedItems.filter(
    (_, idx) => selectedItems.has(idx) && editedItems[idx].status !== "unchanged"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Menu Import</h1>
        <p className="text-muted-foreground">
          Upload a menu image to automatically add or update products
        </p>
      </div>

      {/* Success Banner */}
      {confirmResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <p className="text-green-800 font-medium">
              Menu imported successfully!{" "}
              {confirmResult.added > 0 && `${confirmResult.added} items added. `}
              {confirmResult.updated > 0 &&
                `${confirmResult.updated} items updated.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Menu Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleFileChange}
                className="max-w-sm"
              />
              <Button
                onClick={handleScan}
                disabled={!file || scanning}
              >
                {scanning ? "Scanning..." : "Scan Menu"}
              </Button>
            </div>

            {/* Image Preview */}
            {preview && (
              <div className="border rounded-lg overflow-hidden max-w-lg">
                <img
                  src={preview}
                  alt="Menu preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && editedItems.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{result.summary.total}</p>
                <p className="text-sm text-muted-foreground">Total Found</p>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.summary.new}
                </p>
                <p className="text-sm text-muted-foreground">New Items</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {result.summary.updated}
                </p>
                <p className="text-sm text-muted-foreground">Price Changes</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-gray-500">
                  {result.summary.unchanged}
                </p>
                <p className="text-sm text-muted-foreground">Unchanged</p>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Scanned Items</CardTitle>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  Select / Deselect All
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirming || actionableCount === 0}
                >
                  {confirming
                    ? "Importing..."
                    : `Confirm Import (${actionableCount} items)`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Old Price</TableHead>
                    <TableHead className="text-center">Veg</TableHead>
                    <TableHead className="text-center">Meal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedItems.map((item, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        item.status === "unchanged" ? "opacity-50" : ""
                      }
                    >
                      {/* Checkbox */}
                      <TableCell>
                        {item.status !== "unchanged" && (
                          <input
                            type="checkbox"
                            checked={selectedItems.has(idx)}
                            onChange={() => toggleItem(idx)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        )}
                      </TableCell>

                      {/* Editable Name */}
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateItem(idx, "name", e.target.value)
                          }
                          className="h-8 text-sm"
                          disabled={item.status === "unchanged"}
                        />
                      </TableCell>

                      {/* Editable Category */}
                      <TableCell>
                        <Input
                          value={item.category}
                          onChange={(e) =>
                            updateItem(idx, "category", e.target.value)
                          }
                          className="h-8 text-sm w-32"
                          disabled={item.status === "unchanged"}
                        />
                      </TableCell>

                      {/* Editable Price */}
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={(item.priceCents / 100).toFixed(2)}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "priceCents",
                              Math.round(parseFloat(e.target.value || "0") * 100)
                            )
                          }
                          className="h-8 text-sm w-24 text-right"
                          step="0.01"
                          min="0"
                          disabled={item.status === "unchanged"}
                        />
                      </TableCell>

                      {/* Old Price */}
                      <TableCell className="text-right text-muted-foreground">
                        {item.existingPriceCents !== undefined
                          ? formatCents(item.existingPriceCents)
                          : "—"}
                      </TableCell>

                      {/* Veg Toggle */}
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={item.isVeg}
                          onChange={(e) =>
                            updateItem(idx, "isVeg", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-green-600"
                          disabled={item.status === "unchanged"}
                        />
                      </TableCell>

                      {/* Meal Toggle */}
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={item.isMeal}
                          onChange={(e) =>
                            updateItem(idx, "isMeal", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={item.status === "unchanged"}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={STATUS_STYLES[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
