'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export interface NowPlaying {
  url: string;
  text: string;
  characterName?: string;
}

interface AudioPlayerBarProps {
  current: NowPlaying | null;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function extractWaveformPeaks(url: string, barCount: number): Promise<number[]> {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const channel = decoded.getChannelData(0);
    const len = channel.length;
    const blockSize = Math.floor(len / barCount);
    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize && start + j < len; j++) {
        const v = Math.abs(channel[start + j]);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    const maxPeak = Math.max(...peaks, 0.001);
    return peaks.map((p) => p / maxPeak);
  } catch {
    return Array(barCount).fill(0.3).map(() => 0.2 + Math.random() * 0.5);
  }
}

export default function AudioPlayerBar({ current, onClose }: AudioPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const barCount = 48;

  useEffect(() => {
    if (current?.url && audioRef.current) {
      audioRef.current.src = current.url;
      audioRef.current.loop = false;
      audioRef.current.load();
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      setPeaks([]);
      extractWaveformPeaks(current.url, barCount).then(setPeaks);
      audioRef.current.play().catch(() => {});
    }
  }, [current?.url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = loop;
  }, [loop]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      if (!loop) {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [current?.url, loop]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setProgress(t);
    }
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  if (!current) return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1e] text-white shadow-2xl border-t border-white/10">
      <audio ref={audioRef} />
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="shrink-0 w-10 h-10 flex items-center justify-center text-white hover:text-[#d4a853] transition-colors"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Waveform + Progress */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-end justify-between gap-0.5 h-8">
              {peaks.length > 0
                ? peaks.map((p, i) => {
                    const played = (i / barCount) * 100 < progressPct;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-[2px] rounded-sm transition-colors"
                        style={{
                          height: `${Math.max(4, p * 100)}%`,
                          backgroundColor: played ? '#d4a853' : 'rgba(212, 168, 83, 0.35)',
                        }}
                      />
                    );
                  })
                : (
                  <div className="flex-1 flex items-end justify-between gap-0.5">
                    {Array.from({ length: barCount }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-[2px] rounded-sm bg-[#d4a853]/30"
                        style={{ height: `${30 + Math.sin(i * 0.5) * 30}%` }}
                      />
                    ))}
                  </div>
                )}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={seek}
              className="audio-scrubber w-full cursor-pointer"
            />
          </div>

          {/* Time */}
          <div className="shrink-0 text-sm text-gray-400 tabular-nums">
            {formatTime(progress)} / {formatTime(duration)}
          </div>

          {/* Title */}
          <div className="shrink-0 max-w-[180px] truncate text-sm font-medium text-white">
            {current.text || 'Sin título'}
          </div>

          {/* Loop */}
          <button
            onClick={() => setLoop(!loop)}
            className={`shrink-0 p-1.5 rounded transition-colors ${loop ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-gray-500 hover:text-gray-300'}`}
            title={loop ? 'Desactivar bucle' : 'Activar bucle'}
            aria-label={loop ? 'Desactivar bucle' : 'Activar bucle'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Volume */}
          <div className="shrink-0 flex items-center gap-2 w-24">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={changeVolume}
              className="w-full h-1 accent-[#d4a853] cursor-pointer"
            />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
              aria-label="Cerrar reproductor"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
