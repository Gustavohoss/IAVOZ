"use client";

import React, { useState, useEffect, useRef } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoidVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [playbackError, setPlaybackError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setPlaybackError(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceSubmit(text);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error("Speech recognition error:", event.error);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text) return;
    
    setIsProcessing(true);
    setAiResponse("");
    
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
    } catch (error) {
      console.error("Error processing voice:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isRecording) {
      // Forçar parada imediata
      recognitionRef.current.stop();
    } else {
      // Limpar estados anteriores
      setTranscript("");
      setAiResponse("");
      
      // Garantir que não há nada rodando antes de começar
      try {
        recognitionRef.current.abort(); // Interrompe qualquer sessão fantasma
        
        // Pequeno timeout para garantir que o hardware do microfone foi liberado pelo navegador
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (startError) {
            console.warn("Could not start recognition, it might already be active.");
          }
        }, 100);
      } catch (e) {
        console.error("Failed to reset recognition:", e);
      }
    }
  };

  const manualPlay = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setPlaybackError(false))
        .catch(err => console.error("Manual playback failed:", err));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {/* IA Response Area */}
      <div className="text-center space-y-4 max-w-lg px-6 min-h-[160px] flex flex-col justify-end">
        {transcript && (
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest animate-pulse">
            Você disse: "{transcript}"
          </p>
        )}
        
        {isProcessing ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={1} />
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

      {/* Microphone Button */}
      <div className="relative group">
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={cn(
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_60px_rgba(var(--accent),0.2)]" 
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
        {isRecording ? "Ouvindo..." : "Toque para falar"}
      </p>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}