import React from "react";
import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import ChatPanel from "@/components/chat/ChatPanel";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-chart-3/5 rounded-full blur-3xl" />
      </div>

      <Navigation />

      <main className="relative z-10 pt-4 pb-24 md:pt-20 md:pb-8 px-4 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* AI Chat — floating panel, available on all pages */}
      <ChatPanel />
    </div>
  );
}