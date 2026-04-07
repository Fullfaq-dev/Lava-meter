import React from "react";
import { Link, useLocation } from "react-router-dom";
import { TableProperties, PenLine, BarChart3, Zap, PackageOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Ведомость", icon: TableProperties },
  { path: "/input", label: "Ввод данных", icon: PenLine },
  { path: "/production", label: "Выпуск", icon: PackageOpen },
  { path: "/energy-report", label: "Потребление ЭЭ", icon: FileText },
  { path: "/analytics", label: "Аналитика", icon: BarChart3 },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:fixed md:top-0 md:bottom-auto">
      <div className="mx-auto max-w-7xl px-4 py-2 md:py-0">
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 rounded-none border-b border-white/10 bg-black/40 backdrop-blur-2xl px-6 py-3">
          <div className="flex items-center gap-2 mr-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">ЭнергоУчёт</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-white/10 text-foreground shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile bottom nav */}
        <div className="flex md:hidden items-center justify-around rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl px-2 py-2 mb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-300",
                  isActive
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}