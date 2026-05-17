"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceChat } from "@/ai/flows/voice-chat-flow";
import { Mic, Loader2, Volume2, AlertCircle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoidVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const autoModeRef = useRef(false); // Ref para evitar fechamentos de escopo (stale closures)

  // Sincroniza a ref com o estado
  useEffect(() => {
    autoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignora erros de abort
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
    cleanupRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Browser does not support speech recognition.");
      return;
    }

    // Pequeno delay para garantir que o hardware do microfone foi liberado pela sessão anterior
    setTimeout(() => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR'; // Mantido pt-BR para entender o usuário flexivelmente
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
          setError(null);
        };

        recognition.onspeechstart = () => {
          if (isPlayingRef.current) {
            stopAudio();
          }
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
            setError("Microphone permission denied.");
            setIsAutoMode(false);
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError("Error: " + event.error);
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
          // Se o áudio não estiver tocando e o modo auto estiver on, e não estivermos processando...
          // Mas normalmente o onend acontece ANTES do áudio da IA começar.
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setIsRecording(false);
      }
    }, 200);
  }, [cleanupRecognition, stopAudio]);

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
            console.warn("Autoplay blocked or playback error.");
            isPlayingRef.current = false;
            // Se o autoplay falhar, precisamos reabrir o mic se estiver no modo auto
            if (autoModeRef.current) {
              startRecording();
            }
          });
      }
    } catch (err) {
      console.error("Error processing voice:", err);
      setError("Houve um erro ao processar sua fala.");
      setIsAutoMode(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSession = () => {
    if (isAutoMode || isRecording || isProcessing) {
      setIsAutoMode(false);
      cleanupRecognition();
      stopAudio();
      setIsRecording(false);
    } else {
      setIsAutoMode(true);
      setTranscript("");
      setAiResponse("");
      startRecording();
    }
  };

  // Efeito para monitorar o fim do áudio e reiniciar a escuta
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioEnded = () => {
      isPlayingRef.current = false;
      // Garante que o microfone só abre se o modo automático ainda estiver ativo
      if (autoModeRef.current) {
        startRecording();
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    return () => audio.removeEventListener('ended', handleAudioEnded);
  }, [startRecording]);

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
            You: "{transcript}"
          </p>
        )}
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/50">Professor is thinking...</span>
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
          className={cn(
            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700",
            isRecording 
              ? "bg-accent/20 scale-110 shadow-[0_0_60px_rgba(168,85,247,0.3)]" 
              : isProcessing 
              ? "bg-primary/10 animate-pulse"
              : isAutoMode
              ? "bg-accent/10 border border-accent/20"
              : "bg-primary/5 hover:bg-primary/10 border border-white/5 hover:border-accent/30",
          )}
        >
          {isRecording ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full border border-accent/30 animate-ping" />
              <Mic className="w-10 h-10 text-accent" strokeWidth={1} />
            </div>
          ) : isAutoMode || isProcessing ? (
            <Square className="w-8 h-8 text-muted-foreground/50" strokeWidth={1} fill="currentColor" />
          ) : (
            <Mic className="w-10 h-10 text-muted-foreground/30 group-hover:text-accent/50 transition-colors" strokeWidth={1} />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/30">
          {isRecording ? "Listening..." : isProcessing ? "Processing..." : isAutoMode ? "Auto Class Mode" : "Tap to start learning"}
        </p>
        {isAutoMode && !isRecording && !isProcessing && (
          <span className="text-[8px] text-accent/40 uppercase tracking-widest animate-pulse">Waiting for your voice</span>
        )}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
