"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HelpCircle,
  Book,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const faqs = [
  { q: "How do I add a new menu item?", a: "Go to Operations > Menu or use Menu Import to scan a menu image. You can also add items directly from the Inventory page." },
  { q: "How do I process a refund?", a: "Go to Orders, find the order, and click on it. You can change the status to Cancelled. Refunds through the payment gateway need to be processed from the Stripe dashboard." },
  { q: "How do I set up tables?", a: "Go to Operations > Table to manage your restaurant tables. You can add, edit, or remove tables and assign them numbers." },
  { q: "How do I manage staff permissions?", a: "Go to Staff page to add/remove team members. Each staff member has a role (Admin, Manager, Cashier, Chef, Waiter) that determines their access level." },
  { q: "How do I change tax rate?", a: "Go to Settings and update the Tax Rate field. This will apply to all new orders." },
  { q: "How do I view sales reports?", a: "Go to Reports from the sidebar to see daily summaries, revenue charts, and product performance." },
  { q: "How does the KDS (Kitchen Display) work?", a: "When an order is placed from the POS, a ticket automatically appears on the Kitchen Display. The chef can mark items as preparing, ready, or completed." },
  { q: "How do I manage inventory?", a: "Go to Inventory from the sidebar. You can add items, track stock levels, record purchases, usage, and waste transactions." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left font-medium hover:text-orange-400 transition-colors"
      >
        {q}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="text-sm text-muted-foreground">Find answers and get support</p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-orange-500/40 transition-colors">
          <CardContent className="py-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="font-semibold">Email Support</p>
            <a href="mailto:support@mealstack.app" className="text-sm text-orange-400 hover:underline">
              support@mealstack.app
            </a>
          </CardContent>
        </Card>
        <Card className="hover:border-orange-500/40 transition-colors">
          <CardContent className="py-6 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="font-semibold">Phone Support</p>
            <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
          </CardContent>
        </Card>
        <Card className="hover:border-orange-500/40 transition-colors">
          <CardContent className="py-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="font-semibold">Live Chat</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faqs.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
