"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, AlertCircle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoidVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isPlayingRef = useRef(false);

  // Limpeza profunda da instância de reconhecimento
  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // Removemos todos os listeners para evitar vazamento de memória ou eventos fantasmas
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onspeechstart = null;
        
        recognitionRef.current.abort();
      } catch (e) {
        // Ignora erros de abort se já estiver parado
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isPlayingRef.current = false;
    }
  }, []);

  const startRecording = useCallback(() => {
    // 1. Limpa qualquer tentativa anterior agressivamente
    cleanupRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    // 2. Pequeno delay para garantir que o hardware foi liberado pelo SO
    setTimeout(() => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR'; // Mantido pt-BR para entender dúvidas em português
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          // No-speech e aborted não são erros críticos
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error("Speech Recognition Error:", event.error);
            setError(`Erro no microfone: ${event.error}`);
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setError("Não foi possível iniciar o microfone.");
        setIsRecording(false);
      }
    }, 200);
  }, [cleanupRecognition]);

  const handleVoiceSubmit = async (text: string) => {
    if (!text || isProcessing) return;
    
    setIsProcessing(true);
    setAiResponse("");
    setError(null);
    stopAudio();
    
    try {
      const result = await voiceChat({ userMessage: text });
      setAiResponse(result.text);
      
      if (audioRef.current) {
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play()
          .then(() => {
            isPlayingRef.current = true;
          })
          .catch((err) => {
            console.warn("Autoplay bloqueado. Clique no texto para ouvir.");
            isPlayingRef.current = false;
          });
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Ocorreu um erro ao processar sua voz.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSession = () => {
    // Se está processando a resposta da IA, não permite clicar
    if (isProcessing) return;

    if (isRecording) {
      cleanupRecognition();
      setIsRecording(false);
    } else {
      setTranscript("");
      setAiResponse("");
      startRecording();
    }
  };

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      cleanupRecognition();
      stopAudio();
    };
  }, [cleanupRecognition, stopAudio]);

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
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest">
            Você: "{transcript}"
          </p>
        )}
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/50">O Professor está pensando...</span>
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
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_60px_rgba(168,85,247,0.3)]" 
              : isProcessing 
              ? "bg-primary/10 opacity-50 cursor-not-allowed"
              : "bg-primary/5 hover:bg-primary/10 border border-white/5 hover:border-accent/30",
          )}
        >
          {isRecording ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full border border-accent/30 animate-ping" />
              <Square className="w-8 h-8 text-accent" strokeWidth={1} fill="currentColor" />
            </div>
          ) : isProcessing ? (
            <Loader2 className="w-10 h-10 text-muted-foreground/20 animate-spin" strokeWidth={1} />
          ) : (
            <Mic className="w-10 h-10 text-muted-foreground/30 group-hover:text-accent/50 transition-colors" strokeWidth={1} />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30">
          {isRecording ? "Ouvindo..." : isProcessing ? "Processando..." : "Toque para falar"}
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}