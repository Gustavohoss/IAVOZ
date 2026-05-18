
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
  level: EnglishLevel;
  onBack: () => void;
}

export function VoidVoice({ level, onBack }: VoidVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHardwareCooling, setIsHardwareCooling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // RESET AGRESSIVO: Mata qualquer processo de hardware pendurado
  const killHardware = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      // Remove handlers para evitar updates de estado fantasmas
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort(); // Abort é mais imediato que stop()
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleAIQuery = async (text: string) => {
    if (!text || isProcessing) return;
    
    // Mata o hardware no instante que capturou o texto
    killHardware();
    setIsProcessing(true);
    setAiResponse("");
    setError(null);
    
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
      console.error("AI Error:", err);
      setError("Communication failed. Try again.");
    } finally {
      setIsProcessing(false);
      // Tempo de respiro para o SO liberar o mic
      setIsHardwareCooling(true);
      setTimeout(() => setIsHardwareCooling(false), 1200);
    }
  };

  const initRecognition = useCallback(() => {
    killHardware();
    setError(null);
    setTranscript("");

    // Delay atômico para garantir limpeza de buffer
    setTimeout(() => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Browser unsupported.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = level === 'advanced' ? 'en-US' : 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleAIQuery(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Hardware Error:", event.error);
          if (event.error === 'audio-capture') setError("Mic locked. Wait...");
          else if (event.error === 'not-allowed') setError("Access denied.");
          else setError("Retry.");
          killHardware();
          setIsHardwareCooling(true);
          setTimeout(() => setIsHardwareCooling(false), 1000);
        };

        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        setError("Mic error.");
        setIsHardwareCooling(false);
      }
    }, 150);
  }, [killHardware, level, history]);

  const toggleRecording = () => {
    if (isProcessing || isHardwareCooling) return;
    if (isRecording) killHardware();
    else initRecognition();
  };

  useEffect(() => {
    return () => killHardware();
  }, [killHardware]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center relative bg-background">
      {/* Controles do Topo - Fixados */}
      <div className="fixed top-8 inset-x-8 flex justify-between items-center z-50">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/5 rounded-lg text-muted-foreground hover:text-primary transition-all duration-500"
        >
          <ChevronLeft size={16} />
          <span className="text-[10px] uppercase tracking-[0.2em]">Menu</span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/5 rounded-lg text-muted-foreground hover:text-primary transition-all duration-500"
          >
            <MessageSquare size={16} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-[0.2em]">History</span>
          </button>

          {showHistory && (
            <div className="absolute top-14 right-0 w-80 h-[500px] bg-background/95 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl p-4 flex flex-col animate-in fade-in slide-in-from-top-4 duration-500 z-[100]">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Logs</span>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:text-accent">
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-6 pr-4">
                  {history.length === 0 && (
                    <p className="text-[10px] uppercase text-center text-muted-foreground/10 py-20 tracking-widest">Empty</p>
                  )}
                  {history.map((msg, i) => (
                    <div key={i} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                      <span className="text-[7px] uppercase tracking-[0.4em] opacity-30">{msg.role}</span>
                      <p className={cn("text-[11px] p-3 rounded-lg max-w-[90%] leading-relaxed", msg.role === 'user' ? "bg-accent/10 text-primary border border-accent/20" : "bg-primary/5 text-muted-foreground/80 border border-white/5")}>
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Interface Central */}
      <div className="flex flex-col items-center justify-center gap-12 w-full max-w-2xl px-8">
        <div className="h-20 flex flex-col items-center justify-center gap-4 text-center">
          {error ? (
            <div className="flex items-center gap-2 text-destructive text-[10px] uppercase tracking-widest font-bold">
              <AlertCircle size={14} />
              {error}
            </div>
          ) : transcript && (
            <p className="text-muted-foreground/40 text-[11px] uppercase tracking-widest italic animate-in fade-in">
              "{transcript}"
            </p>
          )}
        </div>

        {/* Círculo do Microfone Central */}
        <div className="relative">
          <button
            onClick={toggleRecording}
            disabled={isProcessing || isHardwareCooling}
            className={cn(
              "relative z-10 w-44 h-44 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-1000",
              isRecording ? "bg-accent/20 pulse-accent" : "bg-white/5 border border-white/5 hover:border-accent/30",
              (isProcessing || isHardwareCooling) && "opacity-30 cursor-not-allowed grayscale"
            )}
          >
            {isRecording ? (
              <Square className="w-12 h-12 text-accent" strokeWidth={1} fill="currentColor" />
            ) : isProcessing ? (
              <Loader2 className="w-14 h-14 text-accent animate-spin" strokeWidth={1} />
            ) : (
              <Mic className="w-16 h-16 text-muted-foreground/20" strokeWidth={1} />
            )}
            
            <span className={cn("absolute bottom-8 text-[9px] uppercase tracking-[0.4em] font-medium", isRecording ? "text-accent animate-pulse" : "text-muted-foreground/20")}>
              {isRecording ? "Listening" : isProcessing ? "Thinking" : isHardwareCooling ? "Resetting" : "Touch"}
            </span>
          </button>
        </div>

        {/* Resposta da IA */}
        <div className="min-h-[160px] w-full flex items-center justify-center">
          {!isProcessing && aiResponse && (
            <p className="text-primary font-light text-xl md:text-2xl tracking-wide leading-relaxed text-center fade-in-slow">
              {aiResponse}
            </p>
          )}
          {isProcessing && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
