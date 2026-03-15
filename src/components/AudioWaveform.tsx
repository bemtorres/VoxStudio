'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  src: string;
  width: number;
  height: number;
  color?: string;
  className?: string;
}

export default function AudioWaveform({
  src,
  width,
  height,
  color = 'rgba(255,255,255,0.6)',
  className = '',
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src || width < 4 || height < 4) return;

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const url = src.startsWith('http') || src.startsWith('blob') ? src : src.startsWith('/') ? src : `/${src}`;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buffer) => {
        const channel = buffer.getChannelData(0);
        const samples = channel.length;
        const step = Math.max(1, Math.floor(samples / Math.max(1, width)));
        const points: number[] = [];
        for (let i = 0; i < width; i++) {
          const start = Math.min(i * step, samples - 1);
          const end = Math.min(start + step, samples);
          let max = 0;
          for (let j = start; j < end; j++) {
            const v = Math.abs(channel[j]);
            if (v > max) max = v;
          }
          points.push(max);
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const c = canvas.getContext('2d');
        if (!c) return;

        c.scale(dpr, dpr);
        c.clearRect(0, 0, width, height);

        const centerY = height / 2;
        const halfH = (height / 2) * 0.85;

        c.beginPath();
        c.moveTo(0, centerY);

        for (let i = 0; i < points.length; i++) {
          const x = (i / (points.length - 1 || 1)) * width;
          const amp = points[i] * halfH;
          const y = centerY - amp;
          c.lineTo(x, y);
        }

        for (let i = points.length - 1; i >= 0; i--) {
          const x = (i / (points.length - 1 || 1)) * width;
          const amp = points[i] * halfH;
          const y = centerY + amp;
          c.lineTo(x, y);
        }

        c.closePath();
        c.fillStyle = color;
        c.fill();
      })
      .catch(() => {});

    return () => ctx.close();
  }, [src, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height, display: 'block', pointerEvents: 'none' }}
    />
  );
}
