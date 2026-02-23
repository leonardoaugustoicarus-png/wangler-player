import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Languages, Music2, Loader2, LogOut } from 'lucide-react';
import SpectrumAnalyzer from './SpectrumAnalyzer';
import { audioCore } from '../services/audioCore';

interface PlayerProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  accentColor: string;
  audioSource: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  trackInfo: {
    title: string;
    artist: string;
    coverUrl?: string;
    lyrics?: { time: number; text: string }[];
  };
  autoPlay?: boolean;
  onAutoPlayDone?: () => void;
  isFetchingCover?: boolean;
  eqValues: number[];
  dspSettings: {
    aiUpsampling: boolean;
    upsamplingLevel: number;
    smartCrossfade: boolean;
    crossfadeDuration: number;
    phaseCorrection: boolean;
  };
  onNext: () => void;
  onPrev: () => void;
  shuffle: boolean;
  setShuffle: (val: boolean) => void;
  repeat: 'none' | 'one' | 'all';
  setRepeat: (val: 'none' | 'one' | 'all') => void;
  volume: number;
  setVolume: (val: number) => void;
  onViewLibrary: () => void;
  nextTrack?: { title: string; artist: string; coverUrl?: string };
  onBeat?: (intensity: number) => void;
  beatIntensity: number;
  onTimeUpdate?: (current: number, duration: number) => void;
  onExit?: () => void;
}

interface LyricLine {
  time: number; // ms
  text: string;
}

const mockLyrics: LyricLine[] = [
  { time: 0, text: "You own the city" },
  { time: 3000, text: "The city owns you" },
  { time: 6000, text: "Midnight city" },
  { time: 9000, text: "Waiting for the sun" },
  { time: 12000, text: "To come and take us home" },
  { time: 15000, text: "Looking at the stars" },
  { time: 18000, text: "Waiting for a sign" },
  { time: 21000, text: "Midnight city" },
  { time: 24000, text: "The neon lights are calling" },
  { time: 27000, text: "In the rhythm of the night" },
  { time: 30000, text: "We are the dreamers" },
  { time: 33000, text: "Hurry up, we're dreaming" },
];

export default function Player({
  isPlaying,
  setIsPlaying,
  accentColor,
  audioSource,
  audioRef,
  trackInfo,
  autoPlay,
  onAutoPlayDone,
  isFetchingCover,
  eqValues,
  dspSettings,
  onNext,
  onPrev,
  shuffle,
  setShuffle,
  repeat,
  setRepeat,
  volume,
  setVolume,
  onViewLibrary,
  nextTrack,
  onBeat,
  beatIntensity,
  onTimeUpdate: onTimeUpdateProp,
  onExit
}: PlayerProps) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const upsampleFilterRef = useRef<BiquadFilterNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-100, 100], [-10, 10]);
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0, 0.5, 1, 0.5, 0]);

  // Audio bands for EQ
  const bands = [20, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 20000];

  // Initialize Web Audio API
  const initAudioContext = () => {
    if (audioRef.current) {
      audioCore.init();
      audioCore.createSource(audioRef.current);
      audioCore.resume();
    }
  };

  // Sync EQ values in real time
  useEffect(() => {
    audioCore.setEQ(eqValues);
  }, [eqValues]);

  // Sync DSP settings
  useEffect(() => {
    // Upsampling and other DSP handled by audioCore in future updates
    // For now we keep it simple to ensure stability
  }, [dspSettings]);

  // Sync audio element with state
  useEffect(() => {
    if (audioRef.current && audioSource) {
      audioCore.setVolume(volume);
      if (isPlaying) {
        initAudioContext();
        audioRef.current.play().catch(e => {
          console.error("Playback failed", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioSource, autoPlay, volume]);

  // Beat detection animation loop
  useEffect(() => {
    const analyser = audioCore.getAnalyser();
    if (!isPlaying || !analyser) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate bass energy (first ~10 bins)
      let bassSum = 0;
      const bassCount = 10;
      for (let i = 0; i < bassCount; i++) {
        bassSum += dataArray[i];
      }
      const bassAvg = bassSum / (bassCount * 255);
      if (onBeat) onBeat(bassAvg);

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, onBeat]);

  // Cleanup on unmount (audioCore handles context closing)
  useEffect(() => {
    return () => {
      // Individual source cleanup handled by browser GC/disconnection
    };
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime * 1000;
      setCurrentTimeMs(cur);
      if (onTimeUpdateProp) onTimeUpdateProp(cur, audioRef.current.duration * 1000);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDurationMs(audioRef.current.duration * 1000);
    }
  };

  // Sync scroll position
  useEffect(() => {
    const currentLyrics = trackInfo.lyrics || mockLyrics;
    if (showLyrics && lyricsRef.current) {
      const activeLineIndex = currentLyrics.findIndex((l, i) =>
        currentTimeMs >= l.time && (i === currentLyrics.length - 1 || currentTimeMs < currentLyrics[i + 1].time)
      );

      if (activeLineIndex !== -1) {
        const activeElement = lyricsRef.current.children[activeLineIndex] as HTMLElement;
        if (activeElement) {
          lyricsRef.current.scrollTo({
            top: activeElement.offsetTop - lyricsRef.current.clientHeight / 2 + activeElement.clientHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTimeMs, showLyrics]);

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onPrev();
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black/40">
      {/* Sticky Top Bar */}
      <div className="flex-shrink-0 px-8 pt-4 pb-2 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center">
          <button
            onClick={onExit}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-[8px] font-display font-bold uppercase tracking-widest"
          >
            <LogOut size={12} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-4 flex flex-col items-center">
        {/* Album Art Area */}
        <div className="flex-shrink-0 flex flex-col items-center justify-start relative py-6 w-full">
          <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
              scale: isPlaying ? 1 + (beatIntensity * 0.05) : 1
            }}
            className="relative w-full aspect-square max-w-[180px] sm:max-w-[220px] group cursor-grab active:cursor-grabbing mx-auto"
          >
            <div
              className="absolute inset-0 rounded-[28px] blur-[30px] opacity-30 transition-colors duration-1000"
              style={{
                backgroundColor: accentColor,
                transform: `scale(${1 + beatIntensity * 0.2})`
              }}
            />

            {isFetchingCover ? (
              <div className="w-full h-full rounded-[28px] bg-white/5 border border-white/20 flex flex-col items-center justify-center relative z-10 shadow-[0_15px_40px_rgba(0,0,0,0.4)] gap-4 backdrop-blur-md">
                <Loader2 size={42} className="animate-spin" style={{ color: accentColor, filter: `drop-shadow(0 0 12px ${accentColor})` }} />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-white animate-pulse" style={{ textShadow: `0 0 15px ${accentColor}` }}>
                    Buscando capa...
                  </span>
                  <span className="text-[7px] font-mono uppercase tracking-widest text-white/30 mt-2">Gemini AI Engine</span>
                </div>
              </div>
            ) : trackInfo.coverUrl ? (
              <img
                src={trackInfo.coverUrl}
                alt="Album Art"
                className="w-full h-full object-cover rounded-[28px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] relative z-10 border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center relative z-10 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
                <Music2 size={64} className="text-white/10" />
              </div>
            )}
          </motion.div>

          {/* Lyrics Toggle Button */}
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className={`absolute bottom-6 right-0 p-3 rounded-full transition-all z-30 ${showLyrics ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            <Languages size={18} />
          </button>

          {/* Floating Lyrics Layer */}
          <AnimatePresence>
            {showLyrics && (
              <motion.div
                initial={{ opacity: 0, y: 20, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, y: 0, backdropFilter: 'blur(40px)' }}
                exit={{ opacity: 0, y: 20, backdropFilter: 'blur(0px)' }}
                className="absolute inset-0 z-20 bg-black/80 rounded-3xl border border-white/10 flex flex-col p-8 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <span className="micro-label text-[10px] text-white/40">Synchronized Lyrics</span>
                  <span className="timecode text-[10px] text-emerald-400">±1ms Sync</span>
                </div>

                <div
                  ref={lyricsRef}
                  className="flex-1 overflow-y-auto no-scrollbar mask-fade-y"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
                  }}
                >
                  <div className="py-[50%] space-y-8">
                    {(trackInfo.lyrics || mockLyrics).map((line, i) => {
                      const currentLyrics = trackInfo.lyrics || mockLyrics;
                      const isActive = currentTimeMs >= line.time && (i === currentLyrics.length - 1 || currentTimeMs < currentLyrics[i + 1].time);
                      return (
                        <motion.p
                          key={i}
                          animate={{
                            opacity: isActive ? 1 : 0.2,
                            scale: isActive ? 1.05 : 1,
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.5)'
                          }}
                          className={`text-xl font-medium leading-relaxed transition-all duration-300 ${isActive ? 'text-shadow-glow' : ''}`}
                          style={{ textShadow: isActive ? `0 0 20px ${accentColor}40` : 'none' }}
                        >
                          {line.text}
                        </motion.p>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Track Info */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.1 } }
            }}
            className="mt-6 text-center"
          >
            <motion.h2
              key={trackInfo.title}
              variants={{
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 }
              }}
              className="text-xl font-display font-bold tracking-tight text-glow shadow-accent/20"
            >
              {trackInfo.title}
            </motion.h2>
            <motion.p
              key={trackInfo.artist}
              variants={{
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 }
              }}
              className="text-white/30 text-[9px] mt-0.5 uppercase tracking-[0.3em] font-mono font-medium"
            >
              {trackInfo.artist}
            </motion.p>
          </motion.div>
        </div>

        {/* Spectrum Analyzer */}
        <div className="w-full my-4">
          <SpectrumAnalyzer isPlaying={isPlaying} accentColor={accentColor} analyser={audioCore.getAnalyser()} />
        </div>

        {/* Up Next Section */}
        <div className="w-full mt-4 pt-4 border-t border-white/5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[8px] font-display font-bold uppercase tracking-[0.2em] text-white/40">Up Next</h3>
            <button
              onClick={onViewLibrary}
              className="text-[8px] font-display font-bold uppercase tracking-[0.2em] text-accent font-bold"
            >
              Library
            </button>
          </div>
          {nextTrack ? (
            <div className="flex items-center space-x-3 p-2 rounded-2xl glass-card border-white/5 cursor-pointer hover:bg-white/5 transition-colors" onClick={onNext}>
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src={nextTrack.coverUrl || `https://picsum.photos/seed/${nextTrack.title}/100/100`}
                  alt="Next"
                  className="w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display font-bold truncate">{nextTrack.title}</p>
                <p className="text-[8px] text-white/30 font-medium truncate">{nextTrack.artist}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-white/5 text-[7px] uppercase tracking-widest text-white/20 font-bold">
              Queue Finished
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Player Controls */}
      <div className="flex-shrink-0 px-8 pt-4 pb-8 z-40 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm border-t border-white/5">
        <audio
          ref={audioRef}
          src={audioSource || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={onNext}
          onCanPlay={() => {
            if (autoPlay) {
              initAudioContext();
              audioRef.current?.play().catch(e => {
                console.error('Playback failed', e);
                setIsPlaying(false);
              });
              setIsPlaying(true);
              onAutoPlayDone?.();
            }
          }}
        />

        {/* Progress Slider */}
        <div className="space-y-2 mb-4">
          <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full shadow-[0_0_15px_rgba(0,212,255,0.5)]"
              style={{ width: `${durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0}%`, backgroundColor: accentColor }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] font-mono text-white/30">
            <span>
              {Math.floor(currentTimeMs / 60000)}:
              {Math.floor((currentTimeMs % 60000) / 1000).toString().padStart(2, '0')}
            </span>
            <span>
              {Math.floor(durationMs / 60000)}:
              {Math.floor((durationMs % 60000) / 1000).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`transition-colors ${shuffle ? 'text-accent' : 'text-white/20 hover:text-white'}`}
            >
              <Shuffle size={14} />
            </button>

            <div className="flex items-center space-x-6">
              <button
                onClick={onPrev}
                className="text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 btn-neon hover:scale-105 active:scale-90 shadow-lg"
              >
                {isPlaying ? (
                  <Pause size={20} fill="white" className="text-white" />
                ) : (
                  <Play size={20} fill="white" className="text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={onNext}
                className="text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>

            <button
              onClick={() => {
                const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
                const nextIndex = (modes.indexOf(repeat) + 1) % modes.length;
                setRepeat(modes[nextIndex]);
              }}
              className={`transition-colors relative ${repeat !== 'none' ? 'text-accent' : 'text-white/20 hover:text-white'}`}
            >
              <Repeat size={14} />
              {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[6px] font-bold">1</span>}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center space-x-3 px-2">
            <Volume2 size={12} className="text-white/20" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-0.5 bg-white/5 rounded-full appearance-none accent-accent cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
