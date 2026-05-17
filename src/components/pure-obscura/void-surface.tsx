"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateMidnightWhispersReflection } from "@/ai/flows/midnight-whispers-reflection";
import { Loader2 } from "lucide-react";
import { StealthControls } from "./stealth-controls";

export function VoidSurface() {
  const [reflection, setReflection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<number>(0);

  const triggerReflection = useCallback(async () => {
    const now = Date.now();
    // Prevent spamming
    if (now - lastTrigger < 3000 || loading) return;
    
    setLoading(true);
    setReflection(null);
    setLastTrigger(now);

    try {
      const result = await generateMidnightWhispersReflection({});
      setReflection(result.reflection);
    } catch (error) {
      console.error("The stillness was interrupted:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, lastTrigger]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // Only trigger if clicking the main void, not controls
    if ((e.target as HTMLElement).closest('.stealth-ui')) return;
    triggerReflection();
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] flex items-center justify-center cursor-none select-none overflow-hidden"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className="max-w-xl px-8 text-center">
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin opacity-20" strokeWidth={1} />
          </div>
        )}
        
        {reflection && !loading && (
          <p className="text-primary font-body text-lg md:text-xl tracking-wide leading-relaxed fade-in-slow">
            {reflection}
          </p>
        )}

        {!reflection && !loading && (
          <p className="text-muted-foreground/20 font-body text-sm tracking-[0.2em] uppercase transition-opacity duration-1000 hover:opacity-100 opacity-0">
            Touch the void
          </p>
        )}
      </div>

      <StealthControls />
    </div>
  );
}