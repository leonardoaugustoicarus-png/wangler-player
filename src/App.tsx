import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, ListMusic, Info, Zap, Search, Loader2, Activity } from 'lucide-react';
import Player from './components/Player';
import Equalizer from './components/Equalizer';
import Library from './components/Library';
import DSPSettings from './components/DSPSettings';
import ArchitectureDoc from './components/ArchitectureDoc';
import { fetchMusicMetadata, getLocalFallbackCover } from './services/musicEngine';
import { audioCore } from './services/audioCore';

export default function App() {
  // Constants
  const STORAGE_KEY = 'audio_wangler_state';
  const accentPresets = ['#00d4ff', '#ff0080', '#581c87', '#00ff80', '#ff8000', '#ffffff', '#ffff00', '#ff0000'];

  const [activeTab, setActiveTab] = useState<'player' | 'eq' | 'library' | 'arch' | 'dsp' | 'settings'>('player');
  const [isPlaying, setIsPlaying] = useState(false);
  const [accentColor, setAccentColor] = useState('#00d4ff');
  const [trackQueue, setTrackQueue] = useState<{
    title: string;
    artist: string;
    coverUrl?: string;
    url?: string;
    lyrics?: { time: number; text: string }[];
    isFetchingMetadata?: boolean;
  }[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [volume, setVolume] = useState(0.8);
  const [autoPlay, setAutoPlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('Tracks');

  const audioRef1 = React.useRef<HTMLAudioElement>(null);
  const audioRef2 = React.useRef<HTMLAudioElement>(null);
  const [activeAudioRef, setActiveAudioRef] = useState<1 | 2>(1);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // EQ State
  const eqBands = [20, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 20000];
  const [eqValues, setEqValues] = useState(eqBands.map(() => 0));

  // DSP State
  const [dspSettings, setDspSettings] = useState({
    aiUpsampling: true,
    upsamplingLevel: 2,
    smartCrossfade: true,
    crossfadeDuration: 3.5,
    phaseCorrection: true
  });

  // Persistence: Load on mount
  useEffect(() => {
    // Service Worker Registration - Disabled temporarily to fix white screen
    /*
    if ('serviceWorker' in navigator && window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW Registered', reg);
      }).catch(err => {
        console.log('SW Registration failed', err);
      });
    }
    */

    // Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed && typeof parsed === 'object') {
          if (parsed.volume !== undefined) setVolume(Math.max(0, Math.min(1, Number(parsed.volume))));
          if (parsed.shuffle !== undefined) setShuffle(Boolean(parsed.shuffle));

          const validRepeat = ['none', 'one', 'all'];
          if (parsed.repeat && validRepeat.includes(parsed.repeat)) {
            setRepeat(parsed.repeat as 'none' | 'one' | 'all');
          }

          if (Array.isArray(parsed.trackQueue)) {
            const cleanedQueue = parsed.trackQueue.map((t: any) => {
              if (t && typeof t === 'object' && t.title && t.artist) {
                return {
                  ...t,
                  url: t.url?.startsWith('blob:') ? undefined : t.url
                };
              }
              return null;
            }).filter(Boolean);
            setTrackQueue(cleanedQueue as any);
          }

          if (parsed.currentTrackIndex !== undefined) {
            const idx = Number(parsed.currentTrackIndex);
            setCurrentTrackIndex(isNaN(idx) ? -1 : idx);
          }

          if (parsed.accentColor && typeof parsed.accentColor === 'string') setAccentColor(parsed.accentColor);

          if (parsed.dspSettings && typeof parsed.dspSettings === 'object' && parsed.dspSettings !== null) {
            setDspSettings(prev => ({ ...prev, ...parsed.dspSettings }));
          }

          if (parsed.librarySearchQuery !== undefined) setLibrarySearchQuery(String(parsed.librarySearchQuery));
          if (parsed.libraryCategory !== undefined) setLibraryCategory(String(parsed.libraryCategory));
        }
      } catch (e) {
        console.error("Failed to load state", e);
        // Fallback: if data is corrupted, clear it to allow app to start
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  // Persistence: Save on change
  useEffect(() => {
    const stateToSave = {
      volume,
      shuffle,
      repeat,
      trackQueue: trackQueue.map(t => ({ ...t, url: t.url?.startsWith('blob:') ? undefined : t.url })),
      currentTrackIndex,
      accentColor,
      dspSettings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [volume, shuffle, repeat, trackQueue, currentTrackIndex, accentColor, dspSettings, librarySearchQuery, libraryCategory]);

  // Handle AI Music Search
  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const metadata = await fetchMusicMetadata(searchQuery);
    setIsSearching(false);

    if (metadata) {
      const newTrack = {
        title: metadata.titulo,
        artist: metadata.artista,
        coverUrl: metadata.capa_url,
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        lyrics: metadata.lyrics,
        isFetchingMetadata: false
      };

      // Se não houver música tocando, adiciona e toca
      if (currentTrackIndex === -1) {
        setTrackQueue([newTrack]);
        setCurrentTrackIndex(0);
      } else {
        // Adiciona à fila
        setTrackQueue(prev => [...prev, newTrack]);
      }

      setAccentColor(metadata.cor_dominante);
      setActiveTab('player');
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // Handle track selection from Library
  const handleSelectTrack = async (file: File) => {
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, "");

    const newTrack = {
      title,
      artist: "Local File",
      url,
      coverUrl: getLocalFallbackCover(title),
      isFetchingMetadata: true
    };

    const newIndex = trackQueue.length;
    setTrackQueue(prev => [...prev, newTrack]);
    setCurrentTrackIndex(newIndex);
    setAutoPlay(true);
    setIsPlaying(false);
    // User requested to keep selection saved/not always switch back
    // For local files, we'll keep switching to player to show it's playing
    setActiveTab('player');

    // Busca automática de capa via Gemini
    try {
      const metadata = await fetchMusicMetadata(title);
      if (metadata) {
        setTrackQueue(prev => {
          const updated = [...prev];
          updated[newIndex] = {
            ...updated[newIndex],
            artist: metadata.artista !== title ? metadata.artista : "Local File",
            coverUrl: metadata.capa_url,
            lyrics: metadata.lyrics,
            isFetchingMetadata: false
          };
          return updated;
        });
        setAccentColor(metadata.cor_dominante);
      } else {
        setTrackQueue(prev => {
          const updated = [...prev];
          if (updated[newIndex]) updated[newIndex].isFetchingMetadata = false;
          return updated;
        });
      }
    } catch (err) {
      console.warn("Não foi possível buscar a capa:", err);
      setTrackQueue(prev => {
        const updated = [...prev];
        if (updated[newIndex]) updated[newIndex].isFetchingMetadata = false;
        return updated;
      });
    }
  };

  const getNextIndex = () => {
    if (trackQueue.length === 0) return -1;
    if (shuffle) return Math.floor(Math.random() * trackQueue.length);
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= trackQueue.length) {
      return repeat === 'all' ? 0 : currentTrackIndex;
    }
    return nextIndex;
  };

  const triggerCrossfade = () => {
    if (isCrossfading || !dspSettings.smartCrossfade) return;
    const nextIndex = getNextIndex();
    if (nextIndex === currentTrackIndex || nextIndex === -1) return;

    setIsCrossfading(true);
    const fadeTime = dspSettings.crossfadeDuration;

    // Inactive becomes next
    const activeRef = activeAudioRef === 1 ? audioRef1 : audioRef2;
    const inactiveRef = activeAudioRef === 1 ? audioRef2 : audioRef1;

    // Start next track silently
    if (inactiveRef.current) {
      inactiveRef.current.currentTime = 0;
      audioCore.fadeSource(inactiveRef.current, 1, fadeTime);
      inactiveRef.current.play();
    }

    // Fade current track down
    if (activeRef.current) {
      audioCore.fadeSource(activeRef.current, 0, fadeTime);
    }

    // Swap and update index after half of the fade for visual sync
    setTimeout(() => {
      setCurrentTrackIndex(nextIndex);
      setActiveAudioRef(activeAudioRef === 1 ? 2 : 1);
      setIsCrossfading(false);
    }, fadeTime * 500);
  };

  const handleTimeUpdate = (currentMs: number, durationMs: number) => {
    if (!dspSettings.smartCrossfade || isCrossfading || durationMs === 0) return;
    const threshold = dspSettings.crossfadeDuration * 1000;
    if (durationMs - currentMs <= threshold && durationMs > threshold) {
      triggerCrossfade();
    }
  };

  const handleNext = () => {
    if (trackQueue.length === 0) return;

    if (repeat === 'one') {
      const activeRef = activeAudioRef === 1 ? audioRef1 : audioRef2;
      if (activeRef.current) {
        activeRef.current.currentTime = 0;
        activeRef.current.play();
      }
      return;
    }

    const nextIndex = getNextIndex();
    setCurrentTrackIndex(nextIndex);
  };

  const handlePrev = () => {
    if (trackQueue.length === 0) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = repeat === 'all' ? trackQueue.length - 1 : 0;
    }
    setCurrentTrackIndex(prevIndex);
  };

  const currentTrack = trackQueue[currentTrackIndex] || {
    title: 'No Track Selected',
    artist: 'Upload from Library',
    coverUrl: 'https://i.postimg.cc/W4ND1Ypt/aguia.webp'
  };

  const nextTrack = trackQueue[currentTrackIndex + 1];

  const handleSelectMockTrack = (track: { title: string, artist: string }, stayInLibrary: boolean = false) => {
    const mockAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Exemplo de áudio real para teste
    const newTrack = {
      ...track,
      url: mockAudioUrl,
      coverUrl: `https://picsum.photos/seed/${track.title}/600/600`,
      lyrics: [
        { time: 0, text: `Listening to ${track.title}` },
        { time: 3000, text: `By ${track.artist}` },
        { time: 6000, text: "High-fidelity audio stream active" },
        { time: 9000, text: "Mastering engine at 100%" }
      ]
    };

    setTrackQueue(prev => [...prev, newTrack]);
    const newIndex = trackQueue.length;

    if (!stayInLibrary) {
      setCurrentTrackIndex(newIndex);
      setAutoPlay(true);
      setIsPlaying(false);
      setActiveTab('player');
    }
  };

  const handleExit = () => {
    setIsPlaying(false);
    setActiveTab('library');
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      trackQueue.forEach(track => {
        if (track.url?.startsWith('blob:')) {
          URL.revokeObjectURL(track.url);
        }
      });
    };
  }, [trackQueue]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-0 sm:p-4 relative bg-midnight overflow-hidden"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      {/* Premium Atmosphere Background */}
      <div className="atmosphere" />

      {/* Dynamic Aura Glow */}
      <motion.div
        animate={{
          opacity: isPlaying ? 0.4 : 0.1,
          scale: 1 + (beatIntensity * 0.2)
        }}
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)`
        }}
      />

      {/* Main App Container */}
      <motion.div
        animate={{
          boxShadow: `0 0 ${40 + (beatIntensity * 60)}px ${accentColor}15`,
        }}
        className="relative z-10 w-full max-w-lg h-[100dvh] sm:h-[850px] sm:max-h-[90vh] flex flex-col glass-premium sm:rounded-[48px] overflow-hidden glass-border-light shadow-2xl"
      >
        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'player' && (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.98, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.02, x: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <Player
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  accentColor={accentColor}
                  audioSource={trackQueue[currentTrackIndex]?.url || null}
                  audioRef={activeAudioRef === 1 ? audioRef1 : audioRef2}
                  trackInfo={trackQueue[currentTrackIndex] || { title: 'No Track Selected', artist: 'Unknown Artist' }}
                  autoPlay={autoPlay}
                  onAutoPlayDone={() => setAutoPlay(false)}
                  isFetchingCover={trackQueue[currentTrackIndex]?.isFetchingMetadata}
                  eqValues={eqValues}
                  dspSettings={dspSettings}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  shuffle={shuffle}
                  setShuffle={setShuffle}
                  repeat={repeat}
                  setRepeat={setRepeat}
                  volume={volume}
                  setVolume={setVolume}
                  onViewLibrary={() => setActiveTab('library')}
                  nextTrack={trackQueue[getNextIndex()]}
                  onBeat={setBeatIntensity}
                  beatIntensity={beatIntensity}
                  onTimeUpdate={handleTimeUpdate}
                  onExit={handleExit}
                />

                {/* Secondary Audio Target for Crossfade */}
                <audio
                  ref={activeAudioRef === 1 ? audioRef2 : audioRef1}
                  src={trackQueue[getNextIndex()]?.url || undefined}
                  className="hidden"
                />
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, scale: 1.02, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: -10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <Library
                  accentColor={accentColor}
                  onSelectTrack={handleSelectTrack}
                  onSelectMockTrack={(track) => handleSelectMockTrack(track, true)}
                  searchQuery={librarySearchQuery}
                  setSearchQuery={setLibrarySearchQuery}
                  category={libraryCategory}
                  setCategory={setLibraryCategory}
                />
              </motion.div>
            )}

            {activeTab === 'eq' && (
              <motion.div
                key="eq"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <Equalizer
                  accentColor={accentColor}
                  eqValues={eqValues}
                  setEqValues={setEqValues}
                  eqBands={eqBands}
                  phaseCorrectionEnabled={dspSettings.phaseCorrection}
                />
              </motion.div>
            )}

            {activeTab === 'dsp' && (
              <motion.div
                key="dsp"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <DSPSettings
                  accentColor={accentColor}
                  dspSettings={dspSettings}
                  setDspSettings={setDspSettings}
                  isInstallable={isInstallable}
                  onInstall={handleInstallApp}
                />
              </motion.div>
            )}

            {activeTab === 'arch' && (
              <motion.div
                key="arch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 overflow-y-auto no-scrollbar"
              >
                <ArchitectureDoc />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <div className="flex flex-col h-full px-8 pt-8 pb-32 overflow-y-auto no-scrollbar">
                  <h2 className="text-3xl font-display font-extrabold tracking-tight mb-8">Settings</h2>

                  <section className="mb-10">
                    <h3 className="micro-label mb-6">Accent Color</h3>
                    <div className="grid grid-cols-4 gap-4 text-white">
                      {['#00d4ff', '#ff0080', '#581c87', '#00ff80', '#ff8000', '#ffffff', '#ffff00', '#ff0000'].map(color => (
                        <button
                          key={color}
                          onClick={() => setAccentColor(color)}
                          className={`w-full aspect-square rounded-2xl transition-all duration-300 ${accentColor === color ? 'scale-110 shadow-lg ring-2 ring-white ring-offset-2 ring-offset-midnight' : 'opacity-40 hover:opacity-100'}`}
                          style={{ backgroundColor: color, boxShadow: accentColor === color ? `0 0 20px ${color}60` : 'none' }}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mb-10">
                    <h3 className="micro-label mb-6">System Info</h3>
                    <div className="space-y-4">
                      <div className="p-5 glass-card rounded-[28px] flex justify-between items-center group">
                        <span className="text-sm font-medium text-white/40 group-hover:text-white transition-colors">Core Engine</span>
                        <span className="text-xs font-mono font-bold text-accent">v2.4.0-Neural</span>
                      </div>
                      <div className="p-5 glass-card rounded-[28px] flex justify-between items-center group">
                        <span className="text-sm font-medium text-white/40 group-hover:text-white transition-colors">AI Model</span>
                        <span className="text-xs font-mono font-bold text-accent">Gemini Ultra</span>
                      </div>
                    </div>
                  </section>

                  <button
                    onClick={() => localStorage.clear()}
                    className="w-full p-6 rounded-[32px] bg-red-500/10 text-red-500 border border-red-500/20 font-display font-bold hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                  >
                    Reset Storage
                  </button>

                  <div className="mt-8 text-center opacity-20 hover:opacity-100 transition-opacity">
                    <p className="micro-label text-[7px] tracking-[0.4em]">Criado por Ivan Wangler</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Navigation Bar */}
        <nav className="flex-shrink-0 px-6 py-4 absolute bottom-0 left-0 right-0 z-50">
          <div className="glass-premium rounded-[32px] p-2 flex justify-between items-center glass-border-light backdrop-blur-[60px]">
            <NavButton active={activeTab === 'player'} icon={<Activity size={20} />} label="Vibe" onClick={() => setActiveTab('player')} activeColor={accentColor} />
            <NavButton active={activeTab === 'library'} icon={<ListMusic size={20} />} label="Vault" onClick={() => setActiveTab('library')} activeColor={accentColor} />
            <NavButton active={activeTab === 'eq'} icon={<Activity size={20} />} label="Master" onClick={() => setActiveTab('eq')} activeColor={accentColor} />
            <NavButton active={activeTab === 'dsp'} icon={<Zap size={20} />} label="Engine" onClick={() => setActiveTab('dsp')} activeColor={accentColor} />
            <NavButton active={activeTab === 'settings'} icon={<Settings2 size={20} />} label="Prefs" onClick={() => setActiveTab('settings')} activeColor={accentColor} />
          </div>
        </nav>
      </motion.div>

      <style dangerouslySetInnerHTML={{
        __html: `
        :root { --accent-color: ${accentColor}; --accent-rgb: ${accentColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ')}; }
        .text-accent { color: ${accentColor}; }
        .bg-accent { background-color: ${accentColor}; }
        .border-accent { border-color: ${accentColor}; }
        
        input[type="range"].eq-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 8px;
          height: 16px;
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 0 10px ${accentColor};
          cursor: pointer;
        }
      ` }} />
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  activeColor: string;
}

function NavButton({ active, icon, label, onClick, activeColor }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-500 ${active ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
    >
      {active && (
        <motion.div
          layoutId="nav-bg"
          className="absolute inset-0 bg-white/5 rounded-2xl"
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
        />
      )}
      <div className={`relative transition-transform duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`} style={{ color: active ? activeColor : undefined }}>
        {icon}
      </div>
      <span className={`text-[8px] font-display font-black uppercase tracking-widest mt-1 transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0 scale-90'}`}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="nav-dot"
          className="absolute -bottom-1 w-1 h-1 rounded-full bg-accent"
          style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
        />
      )}
    </button>
  );
}
