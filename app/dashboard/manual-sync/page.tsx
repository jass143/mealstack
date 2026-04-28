"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, Database, Cloud, Wifi } from "lucide-react";

export default function ManualSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync — in production this would push/pull from cloud
    await new Promise((r) => setTimeout(r, 2000));
    setLastSync(new Date().toLocaleString());
    setSyncing(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Manual Sync</h1>
        <p className="text-sm text-muted-foreground">Sync your local data with the cloud</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="font-semibold">Local Database</p>
            <p className="text-sm text-green-500 mt-1">Connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="font-semibold">Network</p>
            <p className="text-sm text-green-500 mt-1">Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <Cloud className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="font-semibold">Cloud Server</p>
            <p className="text-sm text-green-500 mt-1">Reachable</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Data</CardTitle>
          <CardDescription>
            Push pending local changes and pull latest updates from the cloud.
            Use this if data seems out of sync across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSync} disabled={syncing} size="lg">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>

          {lastSync && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Last synced: {lastSync}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
