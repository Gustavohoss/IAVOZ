"use client";

import React, { useState, useEffect } from "react";
import { Info, Maximize2, Share2, VolumeX, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StealthControls() {
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleMove = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchstart", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchstart", handleMove);
      clearTimeout(timer);
    };
  }, []);

  const iconStyle = { strokeWidth: 0.5 };

  return (
    <div 
      className={cn(
        "stealth-ui fixed inset-x-0 bottom-0 p-8 flex justify-between items-center transition-opacity duration-1000",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex gap-6 items-center">
        <button 
          className="text-primary hover:text-accent transition-colors duration-500"
          onClick={() => setMuted(!muted)}
        >
          {muted ? <VolumeX size={18} {...iconStyle} /> : <Volume2 size={18} {...iconStyle} />}
        </button>
        <button className="text-primary hover:text-accent transition-colors duration-500">
          <Info size={18} {...iconStyle} />
        </button>
      </div>

      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-body">
        Pure Obscura
      </div>

      <div className="flex gap-6 items-center">
        <button className="text-primary hover:text-accent transition-colors duration-500">
          <Share2 size={18} {...iconStyle} />
        </button>
        <button className="text-primary hover:text-accent transition-colors duration-500">
          <Maximize2 size={18} {...iconStyle} />
        </button>
      </div>
    </div>
  );
}