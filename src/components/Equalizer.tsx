import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Save, Activity, FolderOpen } from 'lucide-react';

interface EqualizerProps {
  accentColor: string;
  eqValues: number[];
  setEqValues: React.Dispatch<React.SetStateAction<number[]>>;
  eqBands: number[];
  phaseCorrectionEnabled: boolean;
}

export default function Equalizer({ accentColor, eqValues, setEqValues, eqBands, phaseCorrectionEnabled }: EqualizerProps) {
  const [qFactor, setQFactor] = useState(1.41);

  const handleSliderChange = (index: number, val: number) => {
    const newValues = [...eqValues];
    newValues[index] = val;
    setEqValues(newValues);
  };

  const savePreset = () => {
    localStorage.setItem('audio_wangler_eq_preset', JSON.stringify(eqValues));
    alert("EQ Preset Saved!");
  };

  const loadPreset = () => {
    const saved = localStorage.getItem('audio_wangler_eq_preset');
    if (saved) {
      setEqValues(JSON.parse(saved));
    } else {
      alert("No saved preset found.");
    }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-4 pb-8 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-black tracking-tighter title-premium">Master</h2>
          <p className="micro-label mt-1 text-accent font-bold opacity-80">15-Band Neural Sculpting</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setEqValues(eqBands.map(() => 0))}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.06] transition-all group"
            title="Reset EQ"
          >
            <RotateCcw size={16} className="group-hover:rotate-[-90deg] transition-transform duration-500" />
          </button>
          <button
            onClick={loadPreset}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Load Preset"
          >
            <FolderOpen size={16} />
          </button>
          <button
            onClick={savePreset}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.06] transition-all group"
            title="Save Preset"
          >
            <Save size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* EQ Visualization */}
      <div className="w-full h-36 rounded-[40px] glass-premium mb-10 relative overflow-hidden glass-border-light shadow-2xl">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d={`M 0 72 ${eqValues.map((v, i) => `L ${(i / (eqValues.length - 1)) * 100}% ${72 - v * 4.5}`).join(' ')} L 100% 72 L 100% 144 L 0 144 Z`}
            fill="url(#eqGradient)"
            className="transition-all duration-500"
          />
          <path
            d={`M 0 72 ${eqValues.map((v, i) => `L ${(i / (eqValues.length - 1)) * 100}% ${72 - v * 4.5}`).join(' ')} L 100% 72`}
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
            className="transition-all duration-500"
          />
          {/* Grid lines */}
          {[1, 2, 3, 4].map(i => (
            <line key={i} x1="0" y1={i * 28.8} x2="100%" y2={i * 28.8} stroke="white" strokeOpacity="0.03" />
          ))}
        </svg>
      </div>

      {/* EQ Sliders */}
      <div className="flex-1 flex justify-between items-end pb-4 overflow-x-auto no-scrollbar min-h-[250px]">
        {eqBands.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center space-y-6 px-1">
            <span className="text-[7px] rotate-[-90deg] h-10 flex items-center whitespace-nowrap font-mono font-black text-white/20">
              {freq >= 1000 ? `${freq / 1000}k` : freq}
            </span>
            <div className="relative h-44 w-6 flex justify-center group">
              <div className="absolute inset-y-0 w-[2px] bg-white/[0.03] rounded-full overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-accent opacity-20"
                  style={{ height: `${((eqValues[i] + 12) / 24) * 100}%`, backgroundColor: accentColor }}
                />
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqValues[i]}
                onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                className="eq-slider appearance-none bg-transparent cursor-pointer z-10 w-full"
                style={{
                  WebkitAppearance: 'slider-vertical',
                  height: '100%',
                } as any}
              />
              {/* Custom Thumb indicator */}
              <motion.div
                animate={{
                  bottom: `${((eqValues[i] + 12) / 24) * 100}%`,
                  scale: eqValues[i] === 0 ? 1 : 1.2
                }}
                className="absolute w-4 h-1.5 bg-white rounded-full pointer-events-none z-20 shadow-2xl"
                style={{
                  boxShadow: `0 0 15px ${accentColor}`,
                  backgroundColor: eqValues[i] === 0 ? '#fff' : accentColor
                }}
              />
            </div>
            <span className={`text-[8px] w-6 text-center font-mono font-bold transition-colors ${eqValues[i] === 0 ? 'text-white/10' : 'text-accent'}`}>
              {eqValues[i] > 0 ? '+' : ''}{eqValues[i].toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      {/* Q-Factor Control */}
      <div className="mt-8 p-5 rounded-[32px] glass-card border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="micro-label">Q-Factor</span>
            <span className="text-[8px] text-white/20 font-mono">(Resonance)</span>
          </div>
          <span className="timecode text-xs text-accent font-bold">{qFactor.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="10.0"
          step="0.01"
          value={qFactor}
          onChange={(e) => setQFactor(parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between mt-2">
          <span className="text-[8px] text-white/10 uppercase font-bold tracking-widest">Wide</span>
          <span className="text-[8px] text-white/10 uppercase font-bold tracking-widest">Narrow</span>
        </div>
      </div>

      <div className="mt-4 flex items-center space-x-3 text-white/30">
        <Activity size={14} className={phaseCorrectionEnabled ? 'text-accent animate-pulse' : ''} />
        <span className="micro-label text-[8px]">Real-time Phase Correction: {phaseCorrectionEnabled ? 'Active' : 'Disabled'}</span>
      </div>
    </div>
  );
}
