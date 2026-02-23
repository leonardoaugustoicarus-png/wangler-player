import React from 'react';
import { motion } from 'motion/react';
import { Zap, Sparkles, Timer, Activity, BrainCircuit, Waves, Download } from 'lucide-react';

interface DSPSettingsProps {
  accentColor: string;
  dspSettings: {
    aiUpsampling: boolean;
    upsamplingLevel: number;
    smartCrossfade: boolean;
    crossfadeDuration: number;
    phaseCorrection: boolean;
  };
  setDspSettings: React.Dispatch<React.SetStateAction<{
    aiUpsampling: boolean;
    upsamplingLevel: number;
    smartCrossfade: boolean;
    crossfadeDuration: number;
    phaseCorrection: boolean;
  }>>;
  isInstallable?: boolean;
  onInstall?: () => void;
}

export default function DSPSettings({
  accentColor,
  dspSettings,
  setDspSettings,
  isInstallable,
  onInstall
}: DSPSettingsProps) {
  const toggleSetting = (key: keyof typeof dspSettings) => {
    setDspSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSetting = (key: keyof typeof dspSettings, val: number) => {
    setDspSettings(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col h-full px-6 pt-4 pb-8 overflow-y-auto no-scrollbar">
      <div className="mb-10">
        <h2 className="text-3xl font-display font-black tracking-tighter title-premium">Engine</h2>
        <p className="micro-label mt-1 text-accent font-bold opacity-80">Neural DSP Core v2.4.0-Neural</p>
      </div>

      <div className="space-y-8">
        {/* AI Upsampling Section */}
        <section className="p-8 rounded-[40px] glass-premium relative overflow-hidden glass-border-light shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-2xl ${dspSettings.aiUpsampling ? 'bg-accent/20 text-accent shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 text-white/20'}`}>
                <BrainCircuit size={20} />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold tracking-tight">AI Neural Upsampling</h3>
                <p className="text-[10px] text-white/30 font-medium">Neural reconstruction of lost harmonics</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('aiUpsampling')}
              className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${dspSettings.aiUpsampling ? 'bg-accent' : 'bg-white/[0.05] border border-white/5'}`}
            >
              <motion.div
                animate={{
                  x: dspSettings.aiUpsampling ? 30 : 4,
                  scale: dspSettings.aiUpsampling ? 1.1 : 0.9
                }}
                className={`absolute top-1.5 left-0 w-4 h-4 rounded-full shadow-2xl ${dspSettings.aiUpsampling ? 'bg-white' : 'bg-white/20'}`}
                style={{ boxShadow: dspSettings.aiUpsampling ? `0 0 15px #fff` : 'none' }}
              />
            </button>
          </div>

          {dspSettings.aiUpsampling && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div className="flex justify-between items-center">
                <span className="micro-label">Reconstruction Level</span>
                <span className="timecode text-accent font-bold">{dspSettings.upsamplingLevel}x HD</span>
              </div>
              <div className="flex space-x-3">
                {[2, 4, 8].map(level => (
                  <button
                    key={level}
                    onClick={() => updateSetting('upsamplingLevel', level)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-mono font-black transition-all duration-500 ${dspSettings.upsamplingLevel === level ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_20px_rgba(0,212,255,0.2)] scale-105' : 'bg-white/[0.03] text-white/20 border border-transparent hover:bg-white/[0.05]'}`}
                  >
                    {level}X
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 text-[9px] text-accent/60 bg-accent/5 p-2.5 rounded-xl">
                <Sparkles size={12} />
                <span>AI model optimized for local NPU execution</span>
              </div>
            </motion.div>
          )}
        </section>

        {/* Smart Crossfade Section */}
        <section className="p-8 rounded-[40px] glass-premium relative overflow-hidden glass-border-light shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-2xl ${dspSettings.smartCrossfade ? 'bg-accent/20 text-accent shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 text-white/20'}`}>
                <Waves size={20} />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold tracking-tight">BPM-Sync Crossfade</h3>
                <p className="text-[10px] text-white/30 font-medium">Intelligent transition based on tempo</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('smartCrossfade')}
              className={`w-12 h-6 rounded-full relative transition-colors ${dspSettings.smartCrossfade ? 'bg-blue-500' : 'bg-white/10'}`}
            >
              <motion.div
                animate={{ x: dspSettings.smartCrossfade ? 26 : 2 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {dspSettings.smartCrossfade && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div className="flex justify-between items-center">
                <span className="micro-label">Transition Window</span>
                <span className="timecode text-blue-400 font-bold">{dspSettings.crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.1"
                value={dspSettings.crossfadeDuration}
                onChange={(e) => updateSetting('crossfadeDuration', parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex items-center space-x-2 text-[9px] text-blue-400/60 bg-blue-400/5 p-2.5 rounded-xl">
                <Timer size={12} />
                <span>Analyzing BPM of next track: 124 BPM</span>
              </div>
            </motion.div>
          )}
        </section>

        {/* Phase Correction Section */}
        <section className="p-6 rounded-[32px] glass-card border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-2xl ${dspSettings.phaseCorrection ? 'bg-accent/20 text-accent shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 text-white/20'}`}>
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold tracking-tight">Phase Correction</h3>
                <p className="text-[10px] text-white/30 font-medium">Linear phase alignment for Hi-Res</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('phaseCorrection')}
              className={`w-12 h-6 rounded-full relative transition-colors ${dspSettings.phaseCorrection ? 'bg-accent' : 'bg-white/10'}`}
            >
              <motion.div
                animate={{ x: dspSettings.phaseCorrection ? 26 : 2 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </section>

        {/* PWA Install Button */}
        {isInstallable && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onInstall}
            className="w-full flex items-center justify-center space-x-4 p-7 rounded-[40px] bg-white text-black font-display font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-accent hover:text-white transition-all duration-500"
          >
            <Download size={20} />
            <span>Install Audio Wangler</span>
          </motion.button>
        )}

        {/* Real-time Stats */}
        <div className="mt-4 p-5 rounded-[32px] glass-card border border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity size={16} className="text-accent" />
            <div>
              <p className="micro-label text-[8px] opacity-40">DSP Load</p>
              <p className="timecode text-[10px] font-bold">12.4% @ 384kHz</p>
            </div>
          </div>
          <div className="text-right">
            <p className="micro-label text-[8px] opacity-40">Latency</p>
            <p className="timecode text-[10px] text-accent font-bold">0.8ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
