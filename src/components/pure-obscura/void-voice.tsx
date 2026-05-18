"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, AlertCircle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function VoidVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Limpeza profunda da instância de voz para liberar o hardware
  const killRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort(); 
      } catch (e) {
        // Ignora erros de encerramento
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text || isProcessing) return;
    
    setIsProcessing(true);
    setAiResponse("");
    setError(null);
    
    // Para qualquer áudio da IA que esteja tocando
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    try {
      // Chama a IA passando o histórico acumulado
      const result = await voiceChat({ 
        userMessage: text,
        history: history 
      });
      
      setAiResponse(result.text);

      // Atualiza o histórico local com a nova interação
      setHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'model', content: result.text }
      ]);
      
      if (audioRef.current && result.audioDataUri) {
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play().catch(e => console.warn("Audio play blocked by browser", e));
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Falha na resposta da IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = useCallback(() => {
    // 1. Mata qualquer sessão anterior agressivamente
    killRecognition();

    // 2. Pequeno delay para o hardware do sistema operacional liberar o microfone
    setTimeout(() => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Seu navegador não suporta reconhecimento de voz.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR'; 
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsRecording(true);
          setError(null);
          setTranscript("");
          setAiResponse("");
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Recognition error:", event.error);
          if (event.error === 'audio-capture') {
            setError("Microfone ocupado. Tente clicar novamente.");
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError(`Erro de voz: ${event.error}`);
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error("Critical start error:", e);
        setError("Não foi possível iniciar o microfone.");
        setIsRecording(false);
      }
    }, 250); 
  }, [killRecognition, history]);

  const toggleSession = () => {
    if (isProcessing) return;
    if (isRecording) {
      killRecognition();
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
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/50">Obscura está pensando...</span>
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
          disabled={isProcessing}
          className={cn(
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isRecording 
              ? "bg-accent/20 scale-105 shadow-[0_0_50px_rgba(168,85,247,0.3)]" 
              : "bg-primary/5 border border-white/5 hover:border-accent/30",
            isProcessing && "opacity-50 cursor-not-allowed"
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
              isProcessing ? "text-muted-foreground/10" : "text-muted-foreground/30 group-hover:text-accent/60"
            )} strokeWidth={1} />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30">
          {isRecording ? "Capturando voz..." : isProcessing ? "Processando..." : "Toque para falar"}
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
