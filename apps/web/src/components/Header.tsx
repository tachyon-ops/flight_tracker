"use client";

import { Plane, RefreshCw, Settings, Bell, Calendar, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddFlightModal } from "./AddFlightModal";

export function Header() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const router = useRouter();

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/flights/scan", { method: "POST" });
      if (res.ok) {
        setLastScan("Just now");
        router.refresh(); // Re-fetch server component data
      }
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Route */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  FlightRadar
                </h1>
                <p className="text-xs text-muted-foreground">
                  ZRH → XNA · United Airlines
                </p>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                href="/"
                label="Radar"
                icon={<Zap className="w-4 h-4" />}
                active
              />
              <NavLink
                href="/calendar"
                label="Calendar"
                icon={<Calendar className="w-4 h-4" />}
              />
              <NavLink
                href="/deals"
                label="Deals"
                icon={<Zap className="w-4 h-4" />}
              />
              <NavLink
                href="/alerts"
                label="Alerts"
                icon={<Bell className="w-4 h-4" />}
              />
              <NavLink
                href="/settings"
                label="Settings"
                icon={<Settings className="w-4 h-4" />}
              />
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {lastScan ? `Last scan: ${lastScan}` : "Ready"}
              </span>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all active:scale-95"
                onClick={() => setShowAddFlight(true)}
              >
                + Add
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleScan}
                disabled={scanning}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
                />
                {scanning ? "Scanning..." : "Scan Now"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Add Flight Modal */}
      {showAddFlight && (
        <AddFlightModal onClose={() => setShowAddFlight(false)} />
      )}
    </>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
