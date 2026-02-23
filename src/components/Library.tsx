import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Folder, Music2, Heart, MoreVertical, PlayCircle, Upload } from 'lucide-react';

interface LibraryProps {
  accentColor: string;
  onSelectTrack: (file: File) => void;
  onSelectMockTrack: (track: { title: string, artist: string }) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
}

export default function Library({
  accentColor,
  onSelectTrack,
  onSelectMockTrack,
  searchQuery,
  setSearchQuery,
  category,
  setCategory
}: LibraryProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectTrack(file);
    }
  };

  const tracks = [
    { id: 1, title: "Midnight City", artist: "M83", format: "FLAC 24/192", duration: "4:03" },
    { id: 2, title: "Starboy", artist: "The Weeknd", format: "DSD 128", duration: "3:50" },
    { id: 3, title: "Instant Crush", artist: "Daft Punk", format: "WAV 32/384", duration: "5:37" },
    { id: 4, title: "Dreams", artist: "Fleetwood Mac", format: "FLAC 24/96", duration: "4:17" },
    { id: 5, title: "Blinding Lights", artist: "The Weeknd", format: "FLAC 16/44.1", duration: "3:20" },
    { id: 6, title: "The Less I Know The Better", artist: "Tame Impala", format: "DSD 64", duration: "3:38" },
    { id: 7, title: "Nightcall", artist: "Kavinsky", format: "FLAC 24/48", duration: "4:18" },
  ];

  const filteredTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full px-6 pt-4 pb-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-black tracking-tighter title-premium">Vault</h2>
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="audio/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="Upload Local File"
          >
            <Upload size={18} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent transition-colors duration-300" size={14} />
        <input
          type="text"
          placeholder="Scan your database..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all duration-300 backdrop-blur-md"
        />
      </div>

      {/* Categories */}
      <div className="flex space-x-3 mb-10 overflow-x-auto no-scrollbar pb-2">
        {['Tracks', 'Albums', 'Artists', 'Folders', 'Playlists'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-[9px] uppercase tracking-[0.2em] font-display font-black transition-all duration-500 whitespace-nowrap ${category === cat ? 'bg-white text-black shadow-2xl scale-105' : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06] hover:text-white/60'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
        {filteredTracks.map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ x: 8 }}
            onClick={() => {
              onSelectMockTrack({ title: track.title, artist: track.artist });
              setLastAdded(track.id);
              setTimeout(() => setLastAdded(null), 2000);
            }}
            className="group flex items-center p-4 rounded-[28px] hover:bg-white/[0.03] transition-all cursor-pointer border border-transparent hover:border-white/[0.05]"
          >
            <div className="relative w-16 h-16 rounded-[22px] overflow-hidden mr-5 shadow-2xl ring-1 ring-white/10">
              <img
                src={`https://picsum.photos/seed/${track.title}/100/100`}
                alt={track.title}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent/20 backdrop-blur-sm">
                <PlayCircle size={24} className="text-white drop-shadow-lg" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-display font-bold truncate group-hover:text-accent transition-colors">{track.title}</h4>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] text-white/30 truncate font-medium">{track.artist}</span>
                <span className="text-[8px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-mono font-bold">{track.format}</span>
                {lastAdded === track.id && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[8px] text-emerald-400 font-bold uppercase tracking-tighter"
                  >
                    Adicionado!
                  </motion.span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-4">
              <span className="timecode text-[10px] text-white/30">{track.duration}</span>
              <button
                className="text-white/20 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Opções para: ${track.title}`);
                }}
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredTracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Music2 size={48} className="mb-4 opacity-50" />
            <p className="text-xs uppercase tracking-widest font-bold">No tracks found</p>
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="mt-8 p-6 rounded-[34px] glass-card flex items-center justify-between group overflow-hidden relative">
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-center space-x-4 relative z-10">
          <div className="p-3 rounded-2xl bg-accent/10 text-accent glow-border">
            <Folder size={18} />
          </div>
          <div>
            <p className="micro-label mb-1">Local Storage</p>
            <p className="text-[10px] text-white/50 font-mono font-bold tracking-tight">128 GB <span className="text-white/20">/ 512 GB</span></p>
          </div>
        </div>
        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
          <div className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)] w-1/4" />
        </div>
      </div>
    </div>
  );
}
