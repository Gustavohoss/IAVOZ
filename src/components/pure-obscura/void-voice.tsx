
"use client";

import React, { useState, useEffect, useRef } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, MessageSquare, X, ChevronLeft, Volume2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnglishLevel } from "@/app/page";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

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
  const [history, setHistory] = useState<Message[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Limpeza absoluta de hardware
  const killHardware = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsRecording(false);
  };

  const playAudio = async (uri: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    setAudioBlocked(false);
    audioRef.current.src = uri;
    try {
      await audioRef.current.play();
    } catch (err) {
      console.warn("Autoplay blocked");
      setAudioBlocked(true);
      setLastAudioUri(uri);
    }
  };

  const handleAIQuery = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setAiResponse("");
    
    try {
      const result = await voiceChat({ 
        userMessage: text,
        history: history,
        level: level
      });
      
      const newHistory: Message[] = [
        ...history,
        { role: 'user', content: text },
        { role: 'model', content: result.text }
      ];
      
      setHistory(newHistory);
      setAiResponse(result.text);
      
      if (result.audioDataUri) {
        playAudio(result.audioDataUri);
      }
    } catch (err) {
      console.error("AI Error:", err);
      toast({
        variant: "destructive",
        title: "Void Error",
        description: "The stillness was interrupted. Try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if (isProcessing || isRecording) return;
    
    // Mata qualquer estado anterior antes de começar do zero
    killHardware();

    // Desbloqueia o áudio com silêncio (necessário para navegadores)
    const silenceUri = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    const silent = new Audio(silenceUri);
    silent.play().catch(() => {});

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({ title: "Unsupported", description: "Use Chrome or Edge." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = level === 'advanced' ? 'en-US' : 'pt-BR';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        killHardware(); 
        handleAIQuery(text);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Mic Error:', event.error);
      killHardware();
    };

    recognitionRef.current = recognition;
    
    // Pequeno atraso para garantir que o hardware foi liberado pela função killHardware anterior
    setTimeout(() => {
      try {
        recognition.start();
      } catch (e) {
        console.error("Start error:", e);
        killHardware();
      }
    }, 100);
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center relative bg-[#050505] overflow-hidden">
      {/* HEADER CONTROLS - FIXED TOP */}
      <div className="fixed top-8 inset-x-8 flex justify-between items-start z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/5 rounded-lg text-muted-foreground hover:text-primary transition-all duration-500"
        >
          <ChevronLeft size={16} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Menu</span>
        </button>

        <div className="flex gap-4">
          {audioBlocked && lastAudioUri && (
            <button 
              onClick={() => playAudio(lastAudioUri)}
              className="flex items-center gap-2 px-4 py-2 bg-accent/20 backdrop-blur-xl border border-accent/30 rounded-lg text-accent animate-bounce"
            >
              <Play size={16} fill="currentColor" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Play Voice</span>
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/5 rounded-lg text-muted-foreground hover:text-primary transition-all duration-500"
            >
              <MessageSquare size={16} strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">History</span>
            </button>

            {showHistory && (
              <div className="absolute top-14 right-0 w-80 h-[450px] bg-background/95 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl p-4 flex flex-col z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Session Log</span>
                  <button onClick={() => setShowHistory(false)} className="p-1 hover:text-accent">
                    <X size={16} />
                  </button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    {history.map((msg, i) => (
                      <div key={i} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                        <span className="text-[7px] uppercase tracking-widest opacity-20 font-bold">{msg.role === 'user' ? 'You' : 'Obscura'}</span>
                        <p className={cn("text-[10px] p-2 rounded-lg max-w-[90%] leading-relaxed", msg.role === 'user' ? "bg-accent/10 text-primary" : "bg-primary/5 text-muted-foreground border border-white/5")}>
                          {msg.content}
                        </p>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTRAL INTERFACE */}
      <div className="flex flex-col items-center justify-center gap-12 w-full max-w-2xl px-8 mt-12">
        <div className="h-16 flex flex-col items-center justify-center gap-2 text-center">
          {transcript && (
            <p className="text-muted-foreground/40 text-[11px] uppercase tracking-widest italic animate-pulse">
              "{transcript}"
            </p>
          )}
        </div>

        {/* CENTRAL MIC BUTTON */}
        <div className="relative group">
          {isRecording && <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />}
          
          <button
            onClick={startListening}
            disabled={isProcessing}
            className={cn(
              "relative z-10 w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-700 border border-white/5 shadow-2xl",
              isRecording ? "bg-accent/20 border-accent/30 scale-105 shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)]" : "bg-primary/5 hover:bg-accent/10 hover:border-accent/20",
              isProcessing && "opacity-30 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-accent animate-spin" strokeWidth={1} />
            ) : isRecording ? (
              <Volume2 className="w-12 h-12 text-accent animate-pulse" strokeWidth={1} />
            ) : (
              <Mic className="w-12 h-12 text-muted-foreground/30 group-hover:text-accent/50 transition-colors" strokeWidth={1} />
            )}
            
            <span className={cn(
              "absolute bottom-8 text-[9px] uppercase tracking-[0.4em] font-bold transition-all", 
              isRecording ? "text-accent animate-pulse" : "text-muted-foreground/20"
            )}>
              {isRecording ? "Listening" : isProcessing ? "Thinking" : "Touch"}
            </span>
          </button>
        </div>

        {/* AI RESPONSE AREA */}
        <div className="min-h-[140px] w-full flex items-center justify-center">
          {!isProcessing && aiResponse && (
            <p className="text-primary font-light text-xl md:text-2xl tracking-wide leading-relaxed text-center fade-in-slow max-w-lg">
              {aiResponse}
            </p>
          )}
          {isProcessing && (
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce" />
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
