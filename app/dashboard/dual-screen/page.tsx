"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScreenShare, Monitor, ExternalLink } from "lucide-react";

export default function DualScreenPage() {
  const openCustomerDisplay = () => {
    window.open("/dashboard/led-display", "customer-display", "width=1024,height=768,toolbar=no,menubar=no");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScreenShare className="h-6 w-6" /> Dual Screen Setup
        </h1>
        <p className="text-sm text-muted-foreground">Configure customer-facing display</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Screen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              Primary Screen (POS)
            </CardTitle>
            <CardDescription>Your main billing and order management screen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-accent/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">POS Billing Screen</p>
                <p className="text-xs text-muted-foreground mt-1">Currently active</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => window.open("/dashboard/pos", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" /> Open POS
            </Button>
          </CardContent>
        </Card>

        {/* Secondary Screen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScreenShare className="h-5 w-5 text-green-500" />
              Secondary Screen (Customer)
            </CardTitle>
            <CardDescription>Customer-facing display showing order status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-accent/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <ScreenShare className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Customer Display</p>
                <p className="text-xs text-muted-foreground mt-1">Shows order progress</p>
              </div>
            </div>
            <Button className="w-full" onClick={openCustomerDisplay}>
              <ExternalLink className="h-4 w-4 mr-2" /> Launch Customer Display
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to set up Dual Screen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Connect a second monitor to your POS system</p>
          <p>2. Click "Launch Customer Display" above — it opens in a new window</p>
          <p>3. Drag the customer display window to the second monitor</p>
          <p>4. Press F11 to make it full screen on the customer display</p>
          <p>5. The display auto-refreshes every 10 seconds with order status updates</p>
        </CardContent>
      </Card>
    </div>
  );
}
