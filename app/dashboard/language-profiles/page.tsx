"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Plus, Trash2 } from "lucide-react";

type Language = {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
};

const defaultLanguages: Language[] = [
  { id: "1", name: "English", code: "en", isDefault: true },
];

export default function LanguageProfilesPage() {
  const [languages, setLanguages] = useState<Language[]>(defaultLanguages);
  const [newLang, setNewLang] = useState({ name: "", code: "" });
  const [showAdd, setShowAdd] = useState(false);

  const addLanguage = () => {
    if (!newLang.name || !newLang.code) return;
    setLanguages((prev) => [
      ...prev,
      { id: String(Date.now()), name: newLang.name, code: newLang.code.toLowerCase(), isDefault: false },
    ]);
    setNewLang({ name: "", code: "" });
    setShowAdd(false);
  };

  const removeLanguage = (id: string) => {
    setLanguages((prev) => prev.filter((l) => l.id !== id || l.isDefault));
  };

  const setDefault = (id: string) => {
    setLanguages((prev) =>
      prev.map((l) => ({ ...l, isDefault: l.id === id }))
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Language Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage menu and receipt languages</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add Language</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Language Name</Label>
                <Input
                  placeholder="e.g. Hindi"
                  value={newLang.name}
                  onChange={(e) => setNewLang((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Language Code</Label>
                <Input
                  placeholder="e.g. hi"
                  value={newLang.code}
                  onChange={(e) => setNewLang((p) => ({ ...p, code: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={addLanguage}>Save</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Languages</CardTitle>
          <CardDescription>The default language is used for POS display and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Language</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((lang) => (
                <TableRow key={lang.id}>
                  <TableCell className="font-semibold">{lang.name}</TableCell>
                  <TableCell className="font-mono">{lang.code}</TableCell>
                  <TableCell>
                    {lang.isDefault ? (
                      <Badge className="bg-green-100 text-green-800">Default</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!lang.isDefault && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setDefault(lang.id)}>
                          <Check className="h-4 w-4 mr-1" /> Set Default
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeLanguage(lang.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
