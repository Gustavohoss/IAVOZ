
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, AlertCircle, Square, MessageSquare, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnglishLevel } from "@/app/page";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: 'user' | 'model';
  content: string;
};

interface VoidVoiceProps {
  level?: EnglishLevel;
  onBack: () => void;
}

export function VoidVoice({ level = 'intermediate', onBack }: VoidVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const killHardware = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text || isProcessing) return;
    
    killHardware();
    setIsProcessing(true);
    setAiResponse("");
    setError(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    try {
      const result = await voiceChat({ 
        userMessage: text,
        history: history,
        level: level
      });
      
      setAiResponse(result.text);
      setHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'model', content: result.text }
      ]);
      
      if (audioRef.current && result.audioDataUri) {
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play().catch(e => console.warn("Audio blocked", e));
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Connection to Obscura lost. Try again.");
    } finally {
      setIsProcessing(false);
      setIsResetting(true);
      setTimeout(() => setIsResetting(false), 1000);
    }
  };

  const startListening = useCallback(() => {
    killHardware();
    setIsResetting(true);
    setError(null);

    setTimeout(() => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Browser doesn't support voice capture.");
        setIsResetting(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = level === 'advanced' ? 'en-US' : 'pt-BR'; 
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
          setIsResetting(false);
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Error:", event.error);
          if (event.error === 'no-speech') setError("No speech detected.");
          else setError("Microphone error. Resetting...");
          killHardware();
          setIsResetting(true);
          setTimeout(() => setIsResetting(false), 800);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        setError("Microphone access failed.");
        setIsResetting(false);
      }
    }, 300);
  }, [killHardware, history, level]);

  const toggleSession = () => {
    if (isProcessing || isResetting) return;
    if (isRecording) {
      killHardware();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => killHardware();
  }, [killHardware]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-6">
      <button 
        onClick={onBack}
        className="fixed top-8 left-8 z-50 text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded border border-white/5"
      >
        <ChevronLeft size={14} />
        Back to Menu
      </button>

      <div className="fixed top-8 right-8 z-50">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded border border-white/5"
        >
          <MessageSquare size={16} strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-widest hidden sm:inline">History</span>
        </button>

        {showHistory && (
          <div className="absolute top-12 right-0 w-80 h-[500px] bg-background/95 backdrop-blur-2xl border border-white/5 rounded-lg shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 z-[60]">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Chat Logs</span>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-primary p-1">
                <X size={16} />
              </button>
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-2">
                {history.length === 0 && (
                  <p className="text-[10px] uppercase text-center text-muted-foreground/20 py-20 tracking-widest">Empty void...</p>
                )}
                {history.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-2",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <span className="text-[7px] uppercase tracking-[0.3em] opacity-40 font-bold">{msg.role}</span>
                    <p className={cn(
                      "text-[11px] p-3 rounded-md max-w-[95%] leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-accent/10 text-primary border border-accent/20" 
                        : "bg-primary/5 text-muted-foreground border border-white/5"
                    )}>
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="text-center space-y-8 max-w-xl px-6 min-h-[250px] flex flex-col justify-center mb-12">
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive/80 text-[10px] uppercase tracking-widest animate-pulse font-bold">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="min-h-[20px]">
          {transcript && (
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest italic animate-in fade-in">
              "{transcript}"
            </p>
          )}
        </div>
        
        <div className="min-h-[120px] flex items-center justify-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-accent animate-spin" strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-[0.4em] text-accent/50 animate-pulse">Obscura is thinking...</span>
            </div>
          ) : (
            aiResponse && (
              <div className="space-y-4 max-w-md">
                <p className="text-primary font-body text-base md:text-xl tracking-wide leading-relaxed fade-in-slow">
                  {aiResponse}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="relative group mt-auto mb-12">
        <button
          onClick={toggleSession}
          disabled={isProcessing || isResetting}
          className={cn(
            "relative z-10 w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_80px_rgba(168,85,247,0.3)]" 
              : "bg-primary/5 border border-white/5 hover:border-accent/30 hover:bg-primary/10",
            (isProcessing || isResetting) && "opacity-10 cursor-not-allowed grayscale"
          )}
        >
          {isRecording ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full border border-accent/40 animate-ping" />
              <Square className="w-8 h-8 text-accent" strokeWidth={1} fill="currentColor" />
            </div>
          ) : (
            <Mic className={cn(
              "w-12 h-12 transition-all duration-500",
              (isProcessing || isResetting) ? "text-muted-foreground/5" : "text-muted-foreground/20 group-hover:text-accent/60"
            )} strokeWidth={1} />
          )}
        </button>
      </div>

      <div className="mb-20 flex flex-col items-center gap-2">
        <p className={cn(
          "text-[9px] uppercase tracking-[0.5em] transition-all duration-700 font-medium",
          isRecording ? "text-accent animate-pulse" : "text-muted-foreground/20"
        )}>
          {isRecording ? "Listening..." : isProcessing ? "Processing..." : isResetting ? "Resetting Hardware..." : "Tap to Speak"}
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
