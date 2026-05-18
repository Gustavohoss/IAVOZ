"use client";

import { useState } from "react";
import { VoidVoice } from "@/components/pure-obscura/void-voice";
import { Mic, GraduationCap, ChevronRight, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';

export default function Home() {
  const [view, setView] = useState<"menu" | "chat">("menu");
  const [level, setLevel] = useState<EnglishLevel>("intermediate");

  const levels = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced"
  };

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambience layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />

      {view === "menu" ? (
        <div className="z-10 flex flex-col items-center gap-16 fade-in-slow px-6 max-w-sm w-full">
          <div className="text-center space-y-4">
            <h1 className="text-primary text-3xl font-light tracking-[0.6em] uppercase">
              Obscura
            </h1>
            <p className="text-muted-foreground/30 text-[10px] uppercase tracking-[0.4em]">
              AI English Learning Experience
            </p>
          </div>

          <nav className="w-full flex flex-col gap-4">
            <button 
              onClick={() => setView("chat")}
              className="group flex items-center justify-between p-6 bg-primary/5 hover:bg-accent/10 border border-white/5 hover:border-accent/30 transition-all duration-700 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <GraduationCap size={20} className="text-accent" strokeWidth={1.5} />
                </div>
                <span className="text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground group-hover:text-primary">New Session</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </button>

            <div className="grid grid-cols-2 gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-3 p-6 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-700 rounded-xl">
                    <Settings size={18} className="text-muted-foreground/40" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                      {levels[level]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background/95 backdrop-blur-2xl border-white/5 min-w-[180px]">
                  {(Object.keys(levels) as EnglishLevel[]).map((l) => (
                    <DropdownMenuItem 
                      key={l} 
                      onClick={() => setLevel(l)}
                      className="flex items-center justify-between p-3 text-[10px] uppercase tracking-widest cursor-pointer focus:bg-accent/10 focus:text-accent"
                    >
                      {levels[l]}
                      {level === l && <Check size={12} className="text-accent" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button className="flex flex-col items-center justify-center gap-3 p-6 bg-primary/5 border border-white/5 opacity-40 cursor-not-allowed rounded-xl">
                <Mic size={18} className="text-muted-foreground/40" strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Voice: Algenib</span>
              </button>
            </div>
          </nav>

          <footer className="text-[8px] uppercase tracking-[0.5em] text-muted-foreground/20 text-center">
            Handcrafted for Curiosity
          </footer>
        </div>
      ) : (
        <div className="w-full h-full fade-in-slow">
          <VoidVoice level={level} onBack={() => setView("menu")} />
        </div>
      )}
    </main>
  );
}