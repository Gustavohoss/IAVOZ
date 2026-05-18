"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, AlertCircle, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnglishLevel } from "@/app/page";

type Message = {
  role: 'user' | 'model';
  content: string;
};

interface VoidVoiceProps {
  level?: EnglishLevel;
}

export function VoidVoice({ level = 'intermediate' }: VoidVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false); 
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeSessionId = useRef<number>(0);

  // Limpeza profunda e garantida do hardware
  const killRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      // Removemos todos os ouvintes para evitar que o onend de uma sessão antiga mate uma nova
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      
      try {
        rec.abort();
      } catch (e) {
        // Silencioso
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text || isProcessing) return;
    
    // Matar reconhecimento imediatamente para liberar hardware
    killRecognition();
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
        audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Failed to reach Obscura. Try again.");
    } finally {
      setIsProcessing(false);
      // Cooldown obrigatório de hardware para o SO liberar o mic
      setIsResetting(true);
      setTimeout(() => setIsResetting(false), 1000);
    }
  };

  const startListening = useCallback(() => {
    // 1. Matar qualquer sessão pendente
    killRecognition();
    
    // 2. Incrementar ID da sessão para ignorar eventos fantasmas
    const currentSessionId = ++activeSessionId.current;
    setIsResetting(true);

    // 3. Pequeno delay para garantir que o hardware foi limpo
    setTimeout(() => {
      if (currentSessionId !== activeSessionId.current) return;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Browser does not support voice recognition.");
        setIsResetting(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = level === 'advanced' ? 'en-US' : 'pt-BR'; 
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          if (currentSessionId !== activeSessionId.current) return;
          setIsRecording(true);
          setIsResetting(false);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          if (currentSessionId !== activeSessionId.current) return;
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          if (currentSessionId !== activeSessionId.current) return;
          console.error("Speech Recognition Error:", event.error);
          
          if (event.error === 'audio-capture' || event.error === 'not-allowed') {
            setError("Mic busy. Wait for reset.");
          } else if (event.error === 'no-speech') {
            setError("No voice detected.");
          } else {
            setError("Capture error. Try again.");
          }
          
          killRecognition();
          setIsResetting(true);
          setTimeout(() => setIsResetting(false), 800);
        };

        recognition.onend = () => {
          if (currentSessionId !== activeSessionId.current) return;
          setIsRecording(false);
          // Não chamamos killRecognition aqui para evitar loops, deixamos para o próximo clique
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setError("Failed to start capture.");
        setIsResetting(false);
      }
    }, 300);
  }, [killRecognition, history, level]);

  const toggleSession = () => {
    if (isProcessing || isResetting) return;
    if (isRecording) {
      killRecognition();
      setIsResetting(true);
      setTimeout(() => setIsResetting(false), 500);
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => killRecognition();
  }, [killRecognition]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4 max-w-lg px-6 min-h-[160px] flex flex-col justify-end">
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive/80 text-[10px] uppercase tracking-widest animate-pulse">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {transcript && (
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest italic">
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
              <p className="text-primary font-body text-lg md:text-xl tracking-wide leading-relaxed fade-in-slow">
                {aiResponse}
              </p>
            </div>
          )
        )}
      </div>

      <div className="relative group">
        <button
          onClick={toggleSession}
          disabled={isProcessing || isResetting}
          className={cn(
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isRecording 
              ? "bg-accent/20 scale-105 shadow-[0_0_50px_rgba(168,85,247,0.3)]" 
              : "bg-primary/5 border border-white/5 hover:border-accent/30",
            (isProcessing || isResetting) && "opacity-30 cursor-not-allowed"
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

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30 transition-all duration-300">
          {isRecording ? "Listening to you..." : isProcessing ? "Generating..." : isResetting ? "Resetting hardware..." : "Talk to Obscura"}
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
