import React, { useRef, useEffect } from 'react';

interface SpectrumAnalyzerProps {
  isPlaying: boolean;
  accentColor: string;
  analyser: AnalyserNode | null;
}

export default function SpectrumAnalyzer({ isPlaying, accentColor, analyser }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 64;
    const dataArray = new Uint8Array(bars);
    const data = new Array(bars).fill(0);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bars) - 1;

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < bars; i++) {
        if (analyser && isPlaying) {
          const target = (dataArray[i] / 255) * canvas.height * 0.85;
          data[i] += (target - data[i]) * 0.4;
        } else {
          data[i] *= 0.88;
        }

        const x = i * (barWidth + 1);
        const y = canvas.height - data[i];

        // Premium Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, `${accentColor}20`);
        gradient.addColorStop(0.5, `${accentColor}80`);
        gradient.addColorStop(1, accentColor);

        ctx.shadowBlur = 10;
        ctx.shadowColor = `${accentColor}40`;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // More rounded bars for a "digital" but soft feel
        ctx.roundRect(x, y, barWidth, Math.max(3, data[i]), [4, 4, 1, 1]);
        ctx.fill();

        // Reset shadow for next bar performance
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, accentColor, analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={80}
      className="w-full h-20 opacity-80"
    />
  );
}
