
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
  const [isHardwareCooling, setIsHardwareCooling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // NOVIDADE: Limpeza Atômica que desvincula TUDO antes de descartar
  const killHardwareInstance = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      // Desvincula eventos para evitar que callbacks "fantasmas" rodem depois
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort(); // Abort é mais agressivo que stop()
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text || isProcessing) return;
    
    // Mata a instância IMEDIATAMENTE após capturar o texto
    killHardwareInstance();
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
        audioRef.current.play().catch(e => console.warn("Audio blocked by browser policy", e));
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      setError("The connection to the void was lost. Try again.");
    } finally {
      setIsProcessing(false);
      // NOVIDADE: Cooldown de hardware forçado de 1 segundo
      setIsHardwareCooling(true);
      setTimeout(() => setIsHardwareCooling(false), 1000);
    }
  };

  const startListening = useCallback(() => {
    // Garante que não há nada rodando
    killHardwareInstance();
    setError(null);
    setTranscript("");

    // Pequeno delay para o navegador processar o encerramento da instância anterior
    setTimeout(() => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Voice capture is not supported in this browser.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        // Se for avançado, foca em Inglês, senão Português para facilitar a captura
        recognition.lang = level === 'advanced' ? 'en-US' : 'pt-BR'; 
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error === 'no-speech') setError("I couldn't hear you.");
          else if (event.error === 'audio-capture') setError("Microphone occupied. Resetting...");
          else setError("Listening interrupted.");
          
          killHardwareInstance();
          setIsHardwareCooling(true);
          setTimeout(() => setIsHardwareCooling(false), 800);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        setError("Could not access microphone.");
        setIsHardwareCooling(false);
      }
    }, 150);
  }, [killHardwareInstance, level, history]);

  const toggleRecording = () => {
    if (isProcessing || isHardwareCooling) return;
    if (isRecording) {
      killHardwareInstance();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => killHardwareInstance();
  }, [killHardwareInstance]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-6">
      {/* Opções no Topo - Layout Fixo */}
      <div className="fixed top-8 inset-x-8 flex justify-between items-center z-50">
        <button 
          onClick={onBack}
          className="text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded border border-white/5"
        >
          <ChevronLeft size={14} />
          Back to Menu
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-muted-foreground/40 hover:text-accent transition-colors duration-500 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded border border-white/5"
          >
            <MessageSquare size={16} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest">History</span>
          </button>

          {showHistory && (
            <div className="absolute top-12 right-0 w-80 h-[450px] bg-background/95 backdrop-blur-2xl border border-white/5 rounded shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 z-[60]">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Session Logs</span>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-primary">
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-2">
                  {history.length === 0 && (
                    <p className="text-[10px] uppercase text-center text-muted-foreground/20 py-20 tracking-widest">The void is silent...</p>
                  )}
                  {history.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col gap-2",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <span className="text-[7px] uppercase tracking-[0.3em] opacity-40">{msg.role}</span>
                      <p className={cn(
                        "text-[11px] p-3 rounded max-w-[90%] leading-relaxed",
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
      </div>

      {/* Conteúdo Central */}
      <div className="text-center space-y-12 max-w-xl px-6 min-h-[300px] flex flex-col justify-center items-center">
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive/80 text-[10px] uppercase tracking-widest animate-pulse font-medium">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="min-h-[40px] flex items-center justify-center">
          {transcript && (
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest italic animate-in fade-in">
              "{transcript}"
            </p>
          )}
        </div>
        
        {/* Resposta da IA / Feedback de Processamento */}
        <div className="min-h-[140px] flex items-center justify-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-[0.4em] text-accent/50 animate-pulse">Obscura is thinking</span>
            </div>
          ) : (
            aiResponse && (
              <p className="text-primary font-body text-lg md:text-xl tracking-wide leading-relaxed fade-in-slow">
                {aiResponse}
              </p>
            )
          )}
        </div>

        {/* Botão de Microfone no Centro da Tela */}
        <div className="relative group">
          <button
            onClick={toggleRecording}
            disabled={isProcessing || isHardwareCooling}
            className={cn(
              "relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-700",
              isRecording 
                ? "bg-accent/20 scale-110 shadow-[0_0_100px_rgba(168,85,247,0.4)]" 
                : "bg-primary/5 border border-white/5 hover:border-accent/40 hover:bg-primary/10",
              (isProcessing || isHardwareCooling) && "opacity-20 cursor-not-allowed grayscale"
            )}
          >
            {isRecording ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-36 h-36 rounded-full border border-accent/30 animate-ping" />
                <Square className="w-10 h-10 text-accent" strokeWidth={1} fill="currentColor" />
              </div>
            ) : (
              <Mic className={cn(
                "w-14 h-14 transition-all duration-500",
                (isProcessing || isHardwareCooling) ? "text-muted-foreground/10" : "text-muted-foreground/30 group-hover:text-accent/70"
              )} strokeWidth={1} />
            )}
          </button>

          <div className="mt-8 text-center">
            <p className={cn(
              "text-[9px] uppercase tracking-[0.5em] transition-all duration-700 font-medium",
              isRecording ? "text-accent animate-pulse" : "text-muted-foreground/30"
            )}>
              {isRecording ? "Listening..." : isProcessing ? "Processing..." : isHardwareCooling ? "Resetting Hardware" : "Touch to Converse"}
            </p>
          </div>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
