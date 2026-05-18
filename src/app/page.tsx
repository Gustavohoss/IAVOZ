
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
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden font-body">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent pointer-events-none opacity-30" />
      
      {view === "menu" ? (
        <div className="z-10 flex flex-col items-center gap-12 fade-in-slow px-6">
          <div className="text-center space-y-2">
            <h1 className="text-primary text-2xl font-body tracking-[0.5em] uppercase opacity-80">
              Obscura
            </h1>
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.3em]">
              AI English Tutor
            </p>
          </div>

          <nav className="flex flex-col gap-3 w-64 md:w-72">
            <button 
              onClick={() => setView("chat")}
              className="group flex items-center justify-between p-5 bg-primary/5 hover:bg-accent/10 border border-white/5 hover:border-accent/20 transition-all duration-500 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <GraduationCap size={18} className="text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Start Session</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-accent transition-all" />
            </button>

            <button className="group flex items-center justify-between p-5 bg-primary/5 border border-white/5 transition-all duration-500 rounded-lg opacity-30 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <MessageSquare size={18} className="text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Modules</span>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center gap-3 p-5 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-500 rounded-lg">
                    <Settings size={16} className="text-muted-foreground/60" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">
                      {levelLabels[level]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-background/95 backdrop-blur-xl border-white/5 text-muted-foreground">
                  {(['beginner', 'intermediate', 'advanced'] as EnglishLevel[]).map((l) => (
                    <DropdownMenuItem 
                      key={l} 
                      onClick={() => setLevel(l)}
                      className="flex items-center justify-between gap-6 text-[10px] uppercase tracking-widest focus:bg-accent/10 focus:text-accent cursor-pointer p-3"
                    >
                      {levelLabels[l]}
                      {level === l && <Check size={10} className="text-accent" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button className="flex flex-col items-center gap-3 p-5 bg-primary/5 hover:bg-primary/10 border border-white/5 transition-all duration-500 rounded-lg">
                <Mic size={16} className="text-muted-foreground/60" strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Voice: Algenib</span>
              </button>
            </div>
          </nav>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center fade-in-slow">
          <VoidVoice 
            level={level} 
            onBack={() => setView("menu")} 
          />
        </div>
      )}
      
      <StealthControls />
    </main>
  );
}
