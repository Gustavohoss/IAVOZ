
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

  // Kill hardware and cleanup all listeners
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

    // Short delay to ensure browser releases hardware from previous session
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
      {/* UI Navigation: Back to Menu */}
      <button 
        onClick={onBack}
        className="fixed top-8 left-8 z-50 text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/20 p-2 rounded"
      >
        <ChevronLeft size={14} />
        Back to Menu
      </button>

      {/* UI Navigation: Chat History */}
      <div className="fixed top-8 right-8 z-50">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/20 p-2 rounded"
        >
          <MessageSquare size={16} strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-widest hidden sm:inline">History</span>
        </button>

        {showHistory && (
          <div className="absolute top-12 right-0 w-72 h-96 bg-background/95 backdrop-blur-xl border border-white/5 rounded-lg shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Chat Logs</span>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-primary">
                <X size={14} />
              </button>
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {history.length === 0 && (
                  <p className="text-[10px] uppercase text-center text-muted-foreground/20 py-10">Empty void...</p>
                )}
                {history.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-1",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <span className="text-[8px] uppercase tracking-widest opacity-30">{msg.role}</span>
                    <p className={cn(
                      "text-xs p-2 rounded-lg max-w-[90%]",
                      msg.role === 'user' ? "bg-accent/10 text-primary border border-accent/20" : "bg-primary/5 text-muted-foreground"
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

      {/* Main Conversation Display */}
      <div className="text-center space-y-6 max-w-lg px-6 min-h-[220px] flex flex-col justify-end">
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive/80 text-[10px] uppercase tracking-widest animate-pulse">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {transcript && (
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest italic animate-in fade-in">
            "{transcript}"
          </p>
        )}
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/50">Obscura is thinking...</span>
          </div>
        ) : (
          aiResponse && (
            <div className="space-y-4">
              <p className="text-primary font-body text-base md:text-xl tracking-wide leading-relaxed fade-in-slow">
                {aiResponse}
              </p>
            </div>
          )
        )}
      </div>

      {/* Mic Controls */}
      <div className="relative group mt-12">
        <button
          onClick={toggleSession}
          disabled={isProcessing || isResetting}
          className={cn(
            "relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isRecording 
              ? "bg-accent/20 scale-105 shadow-[0_0_50px_rgba(168,85,247,0.3)]" 
              : "bg-primary/5 border border-white/5 hover:border-accent/30",
            (isProcessing || isResetting) && "opacity-20 cursor-not-allowed"
          )}
        >
          {isRecording ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full border border-accent/40 animate-ping" />
              <Square className="w-8 h-8 text-accent" strokeWidth={1} fill="currentColor" />
            </div>
          ) : (
            <Mic className={cn(
              "w-10 h-10 transition-colors duration-500",
              (isProcessing || isResetting) ? "text-muted-foreground/10" : "text-muted-foreground/30 group-hover:text-accent/60"
            )} strokeWidth={1} />
          )}
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30 transition-all duration-300">
          {isRecording ? "Listening..." : isProcessing ? "Thinking..." : isResetting ? "Cleaning hardware..." : "Tap to Speak"}
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
