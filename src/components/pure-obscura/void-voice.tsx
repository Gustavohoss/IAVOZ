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
  const [showHistory, setShowHistory] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // RESET RADICAL: Força o navegador a liberar o hardware totalmente
  const resetHardware = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleAIQuery = async (text: string) => {
    if (!text || isProcessing) return;
    
    resetHardware(); // Libera o mic IMEDIATAMENTE antes de processar
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
      setError("Failed to connect.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    resetHardware();
    setError(null);
    setTranscript("");

    // O pulo do gato: Esperar 150ms para o SO fechar o canal anterior antes de abrir o novo
    setTimeout(() => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Browser not supported.");
        return;
      }

      const recognition = new SpeechRecognition();
      // Se for iniciante ou intermediário, aceita português para não dar erro de fala não detectada
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
        if (event.error === 'audio-capture') {
          setError("Mic busy. Click again.");
        } else {
          setError("Mic error. Retry.");
        }
        resetHardware();
      };

      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        resetHardware();
      }
    }, 150);
  };

  useEffect(() => {
    return () => resetHardware();
  }, [resetHardware]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center relative bg-[#050505]">
      {/* CONTROLES FIXOS NO TOPO */}
      <div className="fixed top-8 inset-x-8 flex justify-between items-start z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/5 rounded-lg text-muted-foreground hover:text-primary transition-all duration-500"
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
            <div className="absolute top-14 right-0 w-80 h-[450px] bg-background/95 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl p-4 flex flex-col z-[100]">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Session</span>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:text-accent">
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {history.map((msg, i) => (
                    <div key={i} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                      <span className="text-[7px] uppercase tracking-widest opacity-20">{msg.role}</span>
                      <p className={cn("text-[10px] p-2 rounded-lg max-w-[90%]", msg.role === 'user' ? "bg-accent/10 text-primary" : "bg-primary/5 text-muted-foreground")}>
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

      {/* INTERFACE CENTRAL */}
      <div className="flex flex-col items-center justify-center gap-12 w-full max-w-2xl px-8">
        <div className="h-16 flex flex-col items-center justify-center gap-2 text-center">
          {error ? (
            <div className="text-destructive text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          ) : transcript && (
            <p className="text-muted-foreground/30 text-[11px] uppercase tracking-widest italic">
              "{transcript}"
            </p>
          )}
        </div>

        {/* BOTAO MICROFONE CENTRAL */}
        <div className="relative">
          <button
            onClick={isRecording ? resetHardware : startListening}
            disabled={isProcessing}
            className={cn(
              "relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center transition-all duration-1000 border border-white/5",
              isRecording ? "bg-accent/20 pulse-accent border-accent/30" : "bg-primary/5 hover:bg-accent/5 hover:border-accent/20",
              isProcessing && "opacity-30 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <Square className="w-12 h-12 text-accent" strokeWidth={1} fill="currentColor" />
            ) : isProcessing ? (
              <Loader2 className="w-16 h-16 text-accent animate-spin" strokeWidth={1} />
            ) : (
              <Mic className="w-16 h-16 text-muted-foreground/20" strokeWidth={1} />
            )}
            
            <span className={cn("absolute bottom-10 text-[9px] uppercase tracking-[0.4em] font-medium transition-opacity", isRecording ? "text-accent animate-pulse" : "text-muted-foreground/20")}>
              {isRecording ? "Listening" : isProcessing ? "Thinking" : "Touch"}
            </span>
          </button>
        </div>

        {/* RESPOSTA DA IA */}
        <div className="min-h-[120px] w-full flex items-center justify-center">
          {!isProcessing && aiResponse && (
            <p className="text-primary font-light text-xl md:text-2xl tracking-wide leading-relaxed text-center fade-in-slow max-w-lg">
              {aiResponse}
            </p>
          )}
          {isProcessing && (
            <div className="flex gap-1.5">
              <div className="w-1 h-1 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-accent/40 animate-bounce" />
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
