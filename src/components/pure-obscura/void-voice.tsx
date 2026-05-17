"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
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

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceSubmit(text);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    setIsProcessing(true);
    setAiResponse("");
    setPlaybackError(false);
    
    try {
      const result = await voiceChat({ userMessage: text });
      setAiResponse(result.text);
      
      if (audioRef.current) {
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play().catch((err) => {
          setPlaybackError(true);
        });
      }
    } catch (error) {
      console.error("Erro ao processar voz:", error);
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
      recognitionRef.current.stop();
    } else {
      setTranscript("");
      setAiResponse("");
      setPlaybackError(false);
      setIsRecording(true);
      
      if (audioRef.current) {
        audioRef.current.load();
      }
      
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsRecording(false);
      }
    }
  };

  const manualPlay = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => setPlaybackError(false)).catch(console.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12">
      <div className="text-center space-y-4 max-w-lg px-6 min-h-[120px] flex flex-col justify-end">
        {transcript && (
          <p className="text-muted-foreground/40 text-xs uppercase tracking-widest animate-pulse">
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
                  Clique para ouvir
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
            "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_50px_rgba(var(--accent),0.2)]" 
              : "bg-primary/5 hover:bg-primary/10",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          {isRecording ? (
            <Mic className="w-8 h-8 text-accent animate-pulse" strokeWidth={1} />
          ) : (
            <MicOff className="w-8 h-8 text-muted-foreground/40" strokeWidth={1} />
          )}
        </button>
        
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" />
        )}
      </div>

      <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30">
        {isRecording ? "Estou ouvindo..." : "Toque no microfone para falar"}
      </p>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
