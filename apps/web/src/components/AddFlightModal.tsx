"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plane, Calendar, Tag } from "lucide-react";

interface AddFlightModalProps {
  onClose: () => void;
}

export function AddFlightModal({ onClose }: AddFlightModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    origin: "ZRH",
    destination: "XNA",
    carrier: "UA",
    dateOut: "",
    dateReturn: "",
    priority: "P2",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dateReturn: form.dateReturn || undefined,
        }),
      });

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create flight");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative fr-card p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Track New Flight
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Origin (IATA)
              </label>
              <input
                type="text"
                value={form.origin}
                onChange={(e) =>
                  setForm({ ...form, origin: e.target.value.toUpperCase() })
                }
                maxLength={3}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                placeholder="ZRH"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Destination (IATA)
              </label>
              <input
                type="text"
                value={form.destination}
                onChange={(e) =>
                  setForm({
                    ...form,
                    destination: e.target.value.toUpperCase(),
                  })
                }
                maxLength={3}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                placeholder="XNA"
                required
              />
            </div>
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Airline (IATA code, optional)
            </label>
            <input
              type="text"
              value={form.carrier}
              onChange={(e) =>
                setForm({ ...form, carrier: e.target.value.toUpperCase() })
              }
              maxLength={2}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              placeholder="UA"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Departure
              </label>
              <input
                type="date"
                value={form.dateOut}
                onChange={(e) => setForm({ ...form, dateOut: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Return (optional)
              </label>
              <input
                type="date"
                value={form.dateReturn}
                onChange={(e) =>
                  setForm({ ...form, dateReturn: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              <Tag className="w-3 h-3 inline mr-1" />
              Priority
            </label>
            <div className="flex gap-2">
              {(["P1", "P2", "P3"] as const).map((p) => {
                const colors = {
                  P1: { bg: "hsl(0 90% 64%)", bgMuted: "hsl(0 90% 64% / 0.12)" },
                  P2: { bg: "hsl(38 92% 50%)", bgMuted: "hsl(38 92% 50% / 0.12)" },
                  P3: { bg: "hsl(210 40% 50%)", bgMuted: "hsl(210 40% 50% / 0.12)" },
                };
                const isActive = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className="flex-1 py-2 rounded-lg text-xs font-bold tracking-widest transition-all"
                    style={{
                      background: isActive ? colors[p].bg : colors[p].bgMuted,
                      color: isActive ? "#fff" : colors[p].bg,
                      border: `1px solid ${isActive ? colors[p].bg : "transparent"}`,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              placeholder="e.g., Girlfriend's miles"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.dateOut}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Track Flight"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
