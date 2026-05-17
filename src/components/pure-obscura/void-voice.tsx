
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, Volume2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoidVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [playbackError, setPlaybackError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleVoiceSubmit = useCallback(async (text: string) => {
    if (!text || isProcessing) return;
    
    setIsProcessing(true);
    setAiResponse("");
    setError(null);
    
    try {
      const result = await voiceChat({ userMessage: text });
      setAiResponse(result.text);
      
      if (audioRef.current) {
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay blocked, showing manual play button.");
          setPlaybackError(true);
        });
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Houve um erro ao processar sua fala. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Função para limpar e destruir a instância atual
  const cleanupRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignora erros de abort
      }
      recognitionRef.current = null;
    }
  };

  const startRecording = () => {
    // 1. Limpeza total antes de qualquer coisa
    cleanupRecognition();

    // 2. Verificação de suporte
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Navegador não suporta reconhecimento de voz.");
      return;
    }

    // 3. Pequeno delay para garantir que o hardware foi liberado
    setTimeout(() => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
          setError(null);
          setPlaybackError(false);
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setTranscript(text);
            handleVoiceSubmit(text);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setError("Permissão negada ao microfone.");
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError("Erro: " + event.error);
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
        setError("Falha ao abrir microfone. Tente novamente.");
        setIsRecording(false);
      }
    }, 50);
  };

  const toggleRecording = () => {
    if (isProcessing) return;

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setTranscript("");
      setAiResponse("");
      setError(null);
      startRecording();
    }
  };

  const manualPlay = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setPlaybackError(false))
        .catch(err => console.error("Manual playback failed:", err));
    }
  };

  // Limpeza ao desmontar componente
  useEffect(() => {
    return () => cleanupRecognition();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4 max-w-lg px-6 min-h-[160px] flex flex-col justify-end">
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive/80 text-[10px] uppercase tracking-widest animate-bounce">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {transcript && !isProcessing && (
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest">
            Você disse: "{transcript}"
          </p>
        )}
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/50">Analisando sua fala...</span>
          </div>
        ) : (
          aiResponse && (
            <div className="space-y-4">
              <p className="text-primary font-body text-lg md:text-xl tracking-wide leading-relaxed fade-in-slow">
                {aiResponse}
              </p>
              {playbackError && (
                <button 
                  onClick={manualPlay}
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent hover:text-accent-foreground transition-colors duration-300 py-2 px-4 border border-accent/20 rounded-full"
                >
                  <Volume2 size={12} strokeWidth={1.5} />
                  Ouvir novamente
                </button>
              )}
            </div>
          )
        )}
      </div>

      <div className="relative group">
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={cn(
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_60px_rgba(168,85,247,0.2)]" 
              : "bg-primary/5 hover:bg-primary/10 border border-white/5 hover:border-accent/30",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          {isRecording ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-16 h-16 rounded-full border border-accent/50 animate-ping" />
              <Mic className="w-10 h-10 text-accent" strokeWidth={1} />
            </div>
          ) : (
            <Mic className="w-10 h-10 text-muted-foreground/30 group-hover:text-accent/50 transition-colors" strokeWidth={1} />
          )}
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30">
        {isRecording ? "Ouvindo..." : isProcessing ? "Processando..." : "Toque para falar"}
      </p>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
