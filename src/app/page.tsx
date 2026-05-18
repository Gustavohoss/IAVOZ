"use client";

import { useState } from "react";
import { VoidVoice } from "@/components/pure-obscura/void-voice";
import { StealthControls } from "@/components/pure-obscura/stealth-controls";
import { Mic, MessageSquare, Settings, GraduationCap, ChevronRight, Check } from "lucide-react";
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

  const levelLabels = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced"
  };

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent pointer-events-none opacity-30" />
      
      {view === "menu" ? (
        <div className="z-10 flex flex-col items-center gap-12 fade-in-slow">
          <div className="text-center space-y-2">
            <h1 className="text-primary text-2xl font-body tracking-[0.5em] uppercase opacity-80">
              Obscura
            </h1>
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.3em]">
              AI English Tutor
            </p>
          </div>

          <nav className="flex flex-col gap-3 w-64">
            <button 
              onClick={() => setView("chat")}
              className="group flex items-center justify-between p-4 bg-primary/5 hover:bg-accent/10 border border-white/5 hover:border-accent/20 transition-all duration-500 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <GraduationCap size={18} className="text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Start Class</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-accent transition-all" />
            </button>

            <button className="group flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-500 rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <MessageSquare size={18} className="text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Exercises</span>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-500 rounded-lg">
                    <Settings size={16} className="text-muted-foreground/60" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">
                      {levelLabels[level]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border-white/5 text-muted-foreground">
                  {(['beginner', 'intermediate', 'advanced'] as EnglishLevel[]).map((l) => (
                    <DropdownMenuItem 
                      key={l} 
                      onClick={() => setLevel(l)}
                      className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-widest focus:bg-accent/10 focus:text-accent"
                    >
                      {levelLabels[l]}
                      {level === l && <Check size={10} className="text-accent" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button className="flex flex-col items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-500 rounded-lg">
                <Mic size={16} className="text-muted-foreground/60" strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Algenib</span>
              </button>
            </div>
          </nav>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center fade-in-slow">
          <button 
            onClick={() => setView("menu")}
            className="absolute top-12 left-12 text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2"
          >
            <ChevronRight size={12} className="rotate-180" />
            Back to Menu
          </button>
          
          <VoidVoice level={level} />
        </div>
      )}
      
      <StealthControls />
    </main>
  );
}