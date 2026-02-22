import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, ListMusic, Info, Zap, Search, Loader2 } from 'lucide-react';
import Player from './components/Player';
import Equalizer from './components/Equalizer';
import Library from './components/Library';
import DSPSettings from './components/DSPSettings';
import ArchitectureDoc from './components/ArchitectureDoc';
import { fetchMusicMetadata } from './services/musicEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'eq' | 'library' | 'arch' | 'dsp'>('player');
  const [isPlaying, setIsPlaying] = useState(false);
  const [accentColor, setAccentColor] = useState('#00d4ff');
  const [trackQueue, setTrackQueue] = useState<{ title: string; artist: string; coverUrl?: string; url?: string }[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [volume, setVolume] = useState(0.8);
  const [autoPlay, setAutoPlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);

  const audioRef = React.useRef<HTMLAudioElement>(null);

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

  // Handle AI Music Search
  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setIsFetchingCover(true);

    const metadata = await fetchMusicMetadata(searchQuery);
    setIsSearching(false);
    setIsFetchingCover(false);

    if (metadata) {
      const newTrack = {
        title: metadata.titulo,
        artist: metadata.artista,
        coverUrl: metadata.capa_url,
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" // Mock stream for AI tracks
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
      coverUrl: undefined
    };

    const newIndex = trackQueue.length;
    setTrackQueue(prev => [...prev, newTrack]);
    setCurrentTrackIndex(newIndex);
    setAutoPlay(true);
    setIsPlaying(false);
    setActiveTab('player');

    // Busca automática de capa via Gemini
    setIsFetchingCover(true);
    try {
      const metadata = await fetchMusicMetadata(title);
      if (metadata) {
        setTrackQueue(prev => {
          const updated = [...prev];
          updated[newIndex] = {
            ...updated[newIndex],
            artist: metadata.artista !== title ? metadata.artista : "Local File",
            coverUrl: metadata.capa_url
          };
          return updated;
        });
        setAccentColor(metadata.cor_dominante);
      }
    } catch (err) {
      console.warn("Não foi possível buscar a capa:", err);
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleNext = () => {
    if (trackQueue.length === 0) return;

    if (repeat === 'one') {
      setCurrentTrackIndex(currentTrackIndex); // Força re-render se necessário, ou apenas deixe o audio recomeçar
      // No caso do audioRecomeçar, talvez seja melhor apenas setIsPlaying(false) depois setIsPlaying(true)
      // Mas o App vai detectar a mesma URL e talvez não reinicie. 
      // Vou mudar ligeiramente o estado para garantir o reinício.
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= trackQueue.length) {
      nextIndex = repeat === 'all' ? 0 : currentTrackIndex;
    }
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * trackQueue.length);
    }
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

  const handleSelectMockTrack = (track: { title: string, artist: string }) => {
    const mockAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Exemplo de áudio real para teste
    const newTrack = {
      ...track,
      url: mockAudioUrl,
      coverUrl: `https://picsum.photos/seed/${track.title}/600/600`
    };

    setTrackQueue(prev => [...prev, newTrack]);
    setCurrentTrackIndex(trackQueue.length);
    setAutoPlay(true);
    setIsPlaying(false);
    setActiveTab('player');
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

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 relative bg-black border-[4px] border-[#fbbf24]"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      {/* Dynamic Atmospheric Background */}
      <div
        className="atmosphere"
        style={{
          background: `
            radial-gradient(circle at 50% -10%, ${accentColor}08 0%, transparent 60%),
            radial-gradient(circle at 0% 100%, ${accentColor}05 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, ${accentColor}03 0%, transparent 40%)
          `
        }}
      />

      {/* Main App Container */}
      <div className="w-full max-w-md h-[850px] max-h-[90vh] player-chrome rounded-[48px] flex flex-col overflow-hidden relative z-10">

        {/* Header: Greeting & Search */}
        <header className="px-8 pt-6 pb-2 flex items-center justify-between relative">
          <AnimatePresence mode="wait">
            {!showSearch ? (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1"
              >
                <p className="micro-label text-accent opacity-80">Good Evening</p>
                <h1 className="text-lg font-display font-bold tracking-tight">Ivan Wangler</h1>
              </motion.div>
            ) : (
              <motion.form
                key="search"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleAISearch}
                className="flex-1 flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 mr-4"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Ask AI for a track..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full"
                />
                <button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 size={14} className="animate-spin text-accent" /> : <Search size={14} className="text-white/40" />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-xl glass-card transition-all ${showSearch ? 'bg-accent text-white' : 'text-white/60 hover:text-white'}`}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'arch' ? 'player' : 'arch')}
              className={`p-2 rounded-xl glass-card transition-all ${activeTab === 'arch' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Info size={16} />
            </button>
            <button
              onClick={() => setActiveTab('dsp')}
              className={`p-2 rounded-xl glass-card transition-all ${activeTab === 'dsp' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </header>

        {/* Top Navigation */}
        <nav className="flex items-center justify-between px-8 py-4">
          <button
            onClick={() => setActiveTab('library')}
            className={`p-2.5 rounded-xl transition-all duration-300 ${activeTab === 'library' ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
          >
            <ListMusic size={18} />
          </button>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-5 py-1.5 rounded-lg text-[9px] font-display font-bold tracking-[0.15em] uppercase transition-all duration-300 ${activeTab === 'player' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('dsp')}
              className={`px-5 py-1.5 rounded-lg text-[9px] font-display font-bold tracking-[0.15em] uppercase transition-all duration-300 ${activeTab === 'dsp' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
            >
              DSP
            </button>
          </div>

          <button
            onClick={() => setActiveTab('eq')}
            className={`p-2.5 rounded-xl transition-all duration-300 ${activeTab === 'eq' ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
          >
            <Zap size={18} />
          </button>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'player' && (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full"
              >
                <Player
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  accentColor={accentColor}
                  audioSource={currentTrack.url || null}
                  audioRef={audioRef}
                  trackInfo={currentTrack}
                  autoPlay={autoPlay}
                  onAutoPlayDone={() => setAutoPlay(false)}
                  isFetchingCover={isFetchingCover}
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
                  nextTrack={nextTrack}
                />
              </motion.div>
            )}
            {activeTab === 'eq' && (
              <motion.div
                key="eq"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full"
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
            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full"
              >
                <Library
                  accentColor={accentColor}
                  onSelectTrack={handleSelectTrack}
                  onSelectMockTrack={handleSelectMockTrack}
                />
              </motion.div>
            )}
            {activeTab === 'dsp' && (
              <motion.div
                key="dsp"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full"
              >
                <DSPSettings
                  accentColor={accentColor}
                  dspSettings={dspSettings}
                  setDspSettings={setDspSettings}
                />
              </motion.div>
            )}
            {activeTab === 'arch' && (
              <motion.div
                key="arch"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full"
              >
                <ArchitectureDoc />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Signature Footer */}
        <div className="p-4 flex justify-center border-t border-white/5">
          <p className="micro-label text-[8px] text-white/20 tracking-[0.3em]">
            Criado por <span className="text-accent/40 font-bold">Ivan Wangler</span>
          </p>
        </div>
      </div>
    </div>
  );
}

