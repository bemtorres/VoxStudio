'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AudioWaveform from '@/components/AudioWaveform';

type Entry = {
  id: number;
  character_id: number;
  character_name: string;
  character_avatar_path?: string;
  text: string;
  position: number;
  audio_file_path?: string;
};

const PX_PER_SEC_MIN = 24;
const PX_PER_SEC_MAX = 240;
const PX_PER_SEC_DEFAULT = 60;
const TRACK_HEIGHT = 56;
const CLIP_INNER_H = TRACK_HEIGHT - 12;
const CHAR_DURATION = 1 / 12;
const SNAP_SEC = 0.25;

function useEntryDurations(entries: Entry[]) {
  const [durations, setDurations] = useState<Record<number, number>>({});

  useEffect(() => {
    if (entries.length === 0) {
      setDurations({});
      return;
    }
    const map: Record<number, number> = {};
    let done = 0;
    const total = entries.length;

    const flush = () => {
      done++;
      if (done === total) setDurations((d) => ({ ...d, ...map }));
    };

    entries.forEach((entry) => {
      const fallback = Math.max(2, (entry.text?.length || 0) * CHAR_DURATION);
      if (entry.audio_file_path) {
        const audio = new Audio(`/${entry.audio_file_path}`);
        audio.addEventListener('loadedmetadata', () => {
          map[entry.id] = audio.duration;
          flush();
        });
        audio.addEventListener('error', () => {
          map[entry.id] = fallback;
          flush();
        });
      } else {
        map[entry.id] = fallback;
        flush();
      }
    });
  }, [entries]);

  return durations;
}

interface PodcastTimelineEditorProps {
  entries: Entry[];
  cast: { id: number; name: string; avatar_path?: string }[];
  onPlayEntry?: (entry: Entry) => void;
}

export default function PodcastTimelineEditor({
  entries,
  cast,
  onPlayEntry,
}: PodcastTimelineEditorProps) {
  const entryDurations = useEntryDurations(entries);
  const [pxPerSec, setPxPerSec] = useState(PX_PER_SEC_DEFAULT);
  const [startTimes, setStartTimes] = useState<Record<number, number>>({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundDuration, setBackgroundDuration] = useState(0);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [volumes, setVolumes] = useState<Record<number, number>>({});
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0 });
  const timelineRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userHasDraggedRef = useRef(false);

  useEffect(() => () => {
    playbackRef.current?.stop();
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  // Inicializar startTimes en secuencia solo la primera vez (o cuando cambian los entries y no se ha arrastrado)
  const initializedLayoutRef = useRef(false);
  useEffect(() => {
    if (entries.length === 0) {
      setStartTimes({});
      setTotalDuration(0);
      initializedLayoutRef.current = false;
      return;
    }
    if (userHasDraggedRef.current) {
      // Solo actualizar totalDuration; no tocar startTimes
      setTotalDuration((prev) => prev);
      return;
    }
    if (!initializedLayoutRef.current) {
      let t = 0;
      const starts: Record<number, number> = {};
      entries.forEach((e) => {
        starts[e.id] = t;
        t += entryDurations[e.id] ?? 2;
      });
      setStartTimes(starts);
      setTotalDuration(t);
      initializedLayoutRef.current = true;
    }
  }, [entries, entryDurations]);

  // Añadir startTime para entries nuevos y recalcular totalDuration siempre
  useEffect(() => {
    const next: Record<number, number> = { ...startTimes };
    let maxEnd = backgroundDuration;
    let changed = false;
    entries.forEach((e) => {
      const dur = entryDurations[e.id] ?? 2;
      if (next[e.id] === undefined) {
        next[e.id] = maxEnd;
        changed = true;
      }
      maxEnd = Math.max(maxEnd, next[e.id] + dur);
    });
    if (changed) setStartTimes(next);
    setTotalDuration((prev) => Math.max(prev, maxEnd, 1));
  }, [entries, entryDurations, backgroundDuration, startTimes]);

  const castIds = cast.map((c) => c.id);
  useEffect(() => {
    const v: Record<number, number> = {};
    castIds.forEach((id) => (v[id] = 1));
    setVolumes((prev) => ({ ...v, ...prev }));
  }, [castIds.join(',')]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!timelineRef.current) return;
    const el = timelineRef.current;
    const rect = el.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setPxPerSec((p) => Math.max(PX_PER_SEC_MIN, Math.min(PX_PER_SEC_MAX, p * (1 + delta * 0.15))));
  }, []);

  const handleDragStart = useCallback((entryId: number, clientX: number, startTime: number) => {
    setDraggingId(entryId);
    dragStartRef.current = { x: clientX, startTime };
  }, []);

  useEffect(() => {
    if (draggingId === null) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dt = dx / pxPerSec;
      let newStart = dragStartRef.current.startTime + dt;
      newStart = Math.max(0, newStart);
      newStart = Math.round(newStart / SNAP_SEC) * SNAP_SEC;
      setStartTimes((prev) => ({ ...prev, [draggingId!]: newStart }));
      userHasDraggedRef.current = true;
    };
    const onUp = () => setDraggingId(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [draggingId, pxPerSec]);

  const handleBackgroundFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    const url = URL.createObjectURL(file);
    setBackgroundUrl(url);
    setBackgroundFile(file);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => setBackgroundDuration(audio.duration));
    audio.addEventListener('error', () => setBackgroundDuration(0));
  }, [backgroundUrl]);

  const play = useCallback(async () => {
    if (entries.length === 0 && !backgroundUrl) return;

    const seekTime = currentTime;
    const total = Math.max(totalDuration, backgroundDuration);
    if (seekTime >= total) return;

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current = ctx;

    const now = ctx.currentTime;
    const stopNodes: { stop: () => void }[] = [];

    const gainDest = ctx.createGain();
    gainDest.connect(ctx.destination);

    if (backgroundUrl && seekTime < 0.01) {
      try {
        const res = await fetch(backgroundUrl);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = backgroundVolume;
        src.connect(g);
        g.connect(gainDest);
        src.start(now);
        src.stop(now + buf.duration);
        stopNodes.push({ stop: () => src.stop() });
      } catch {
        // ignore
      }
    } else if (backgroundUrl && seekTime >= 0.01) {
      try {
        const audio = new Audio(backgroundUrl);
        await new Promise<void>((res, rej) => {
          audio.oncanplaythrough = () => res();
          audio.onerror = rej;
          audio.load();
        });
        audio.currentTime = seekTime;
        const src = ctx.createMediaElementSource(audio);
        const g = ctx.createGain();
        g.gain.value = backgroundVolume;
        src.connect(g);
        g.connect(ctx.destination);
        audio.play();
        stopNodes.push({ stop: () => audio.pause() });
      } catch {
        // ignore
      }
    }

    entries.forEach((entry) => {
      const start = startTimes[entry.id] ?? 0;
      if (start < seekTime) return;
      const dur = entryDurations[entry.id] ?? 2;
      const vol = volumes[entry.character_id] ?? 1;
      if (!entry.audio_file_path) return;

      fetch(`/${entry.audio_file_path}`)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
        .then((buffer) => {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const g = ctx.createGain();
          g.gain.value = vol;
          src.connect(g);
          g.connect(gainDest);
          const when = now + (start - seekTime);
          src.start(when);
          src.stop(when + buffer.duration);
          stopNodes.push({ stop: () => src.stop() });
        })
        .catch(() => {});
    });

    playbackRef.current = { stop: () => stopNodes.forEach((n) => n.stop()) };

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    setIsPlaying(true);

    const start = performance.now();
    const interval = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const t = seekTime + elapsed;
      setCurrentTime(Math.min(t, total));
      if (t >= total) {
        clearInterval(interval);
        playbackIntervalRef.current = null;
        setIsPlaying(false);
        playbackRef.current = null;
      }
    }, 100);
    playbackIntervalRef.current = interval;
  }, [
    entries,
    backgroundUrl,
    backgroundVolume,
    startTimes,
    entryDurations,
    volumes,
    totalDuration,
    backgroundDuration,
    currentTime,
  ]);

  const stop = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const characterColors: Record<number, string> = {};
  const colors = ['#0d9488', '#7c3aed', '#2563eb', '#ea580c', '#16a34a'];
  cast.forEach((c, i) => (characterColors[c.id] = colors[i % colors.length]));

  const width = Math.max(800, totalDuration * pxPerSec);
  const scrubLeft = currentTime * pxPerSec;

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(Math.floor(sec % 60) + '').padStart(2, '0')}`;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingId || (e.target as HTMLElement).closest('[data-timeline-clip]')) return;
      const el = timelineRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left + el.scrollLeft;
      const time = Math.max(0, Math.min(totalDuration, px / pxPerSec));
      setCurrentTime(time);
    },
    [draggingId, totalDuration, pxPerSec]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== ' ' || (e.target as HTMLElement).closest('input, textarea, select')) return;
      e.preventDefault();
      if (isPlaying) stop();
      else play();
    },
    [isPlaying, stop, play]
  );

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-[#0f172a] rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-600/50 shrink-0 bg-slate-800/80">
        <div className="flex items-center gap-4">
          <button
            onClick={isPlaying ? stop : play}
            disabled={entries.length === 0 && !backgroundUrl}
            className="p-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
            <span className="text-slate-500">Tiempo</span>
            <span className="text-white font-semibold tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-slate-500">/</span>
            <span className="tabular-nums">{formatTime(totalDuration)}</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">Clic = posición · Espacio = play/pausa</span>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-600">
            <button
              type="button"
              onClick={() => setPxPerSec((p) => Math.min(PX_PER_SEC_MAX, p * 1.3))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-600"
              title="Acercar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setPxPerSec((p) => Math.max(PX_PER_SEC_MIN, p / 1.3))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-600"
              title="Alejar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-7" />
              </svg>
            </button>
            <span className="text-xs text-slate-500 w-12">{Math.round(pxPerSec)} px/s</span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <span>Audio de fondo</span>
          <input type="file" accept="audio/*" onChange={handleBackgroundFile} className="hidden" />
          <span className="px-3 py-1.5 rounded-lg bg-slate-600/60 hover:bg-slate-600 text-white text-xs font-medium">
            {backgroundFile ? backgroundFile.name : 'Cargar'}
          </span>
        </label>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Panel izquierdo: pistas + volumen */}
        <div className="w-48 shrink-0 flex flex-col border-r border-slate-700/60 bg-slate-800/40 overflow-y-auto">
          <div className="h-9 shrink-0 flex items-center px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Pistas
          </div>
          {cast.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 shrink-0"
              style={{ height: TRACK_HEIGHT }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/10"
                style={{ backgroundColor: characterColors[c.id] || '#64748b' }}
              />
              <span className="text-xs text-slate-200 truncate flex-1 font-medium">{c.name || 'Sin nombre'}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumes[c.id] ?? 1}
                onChange={(e) => setVolumes((v) => ({ ...v, [c.id]: +e.target.value }))}
                className="w-14 h-1.5 accent-emerald-500 bg-slate-600 rounded-full"
                title="Volumen"
              />
            </div>
          ))}
          {backgroundUrl && (
            <div
              className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 shrink-0"
              style={{ height: TRACK_HEIGHT }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500 ring-2 ring-white/10" />
              <span className="text-xs text-slate-200 truncate flex-1 font-medium">Fondo</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={backgroundVolume}
                onChange={(e) => setBackgroundVolume(+e.target.value)}
                className="w-14 h-1.5 accent-amber-500 bg-slate-600 rounded-full"
                title="Volumen fondo"
              />
            </div>
          )}
        </div>

        {/* Timeline con zoom por rueda y clic para buscar */}
        <div
          ref={timelineRef}
          className="flex-1 min-w-0 flex flex-col overflow-auto bg-slate-900/50 outline-none"
          onWheel={handleWheel}
          onClick={handleTimelineClick}
          style={{ cursor: draggingId ? 'grabbing' : undefined }}
        >
          {/* Regla de tiempo */}
          <div
            className="h-9 shrink-0 flex items-center border-b border-slate-600/60 relative bg-slate-800/60 cursor-pointer"
            style={{ minWidth: width }}
          >
            {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => i).map((sec) => (
              <div
                key={sec}
                className="absolute flex flex-col items-start"
                style={{ left: sec * pxPerSec }}
              >
                <div className="w-px h-2 bg-slate-500/80" />
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 ml-0.5 tabular-nums">
                  {formatTime(sec)}
                </span>
              </div>
            ))}
          </div>

          {/* Pistas de clips */}
          <div className="flex-1 min-h-0 relative" style={{ minWidth: width }}>
            {cast.map((c) => (
              <div
                key={c.id}
                className="relative border-b border-slate-700/50 bg-slate-800/20"
                style={{ height: TRACK_HEIGHT, minWidth: width }}
              >
                {entries
                  .filter((e) => e.character_id === c.id)
                  .map((entry) => {
                    const start = startTimes[entry.id] ?? 0;
                    const dur = entryDurations[entry.id] ?? 2;
                    const left = start * pxPerSec;
                    const w = Math.max(dur * pxPerSec, 32);
                    const color = characterColors[c.id] || '#64748b';
                    const isDragging = draggingId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => {
                          if (e.button === 0) handleDragStart(entry.id, e.clientX, start);
                        }}
                        onClick={(e) => {
                          if (draggingId === null) onPlayEntry?.(entry);
                          e.preventDefault();
                        }}
                        data-timeline-clip
                        className={`absolute top-1.5 bottom-1.5 rounded-md overflow-hidden text-left transition-shadow select-none ${
                          isDragging ? 'shadow-lg shadow-black/50 z-20 scale-[1.02]' : 'hover:ring-2 hover:ring-white/40 cursor-grab active:cursor-grabbing'
                        }`}
                        style={{
                          left: `${left}px`,
                          width: `${w}px`,
                          backgroundColor: color,
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                        title={`${entry.text?.slice(0, 50)}… — Arrastra para mover`}
                      >
                        {entry.audio_file_path && w >= 40 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <AudioWaveform
                              src={`/${entry.audio_file_path}`}
                              width={Math.max(1, Math.floor(w))}
                              height={CLIP_INNER_H}
                              color="rgba(255,255,255,0.5)"
                              className="absolute inset-0 w-full h-full"
                            />
                          </div>
                        )}
                        <span className="relative z-10 block truncate text-[10px] font-medium px-2 py-1.5 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {entry.text?.slice(0, 28)}
                          {(entry.text?.length ?? 0) > 28 ? '…' : ''}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}

            {backgroundUrl && (
              <div
                className="relative border-b border-slate-700/50 bg-slate-800/30"
                style={{ height: TRACK_HEIGHT, minWidth: width }}
              >
                <div
                  className="absolute top-1.5 bottom-1.5 left-0 rounded-md overflow-hidden border border-amber-400/30"
                  style={{ width: `${Math.max(backgroundDuration * pxPerSec, 48)}px`, backgroundColor: 'rgba(245, 158, 11, 0.5)' }}
                >
                  {backgroundDuration > 0 && (
                    <AudioWaveform
                      src={backgroundUrl}
                      width={Math.max(32, Math.floor(backgroundDuration * pxPerSec))}
                      height={CLIP_INNER_H}
                      color="rgba(0,0,0,0.25)"
                      className="absolute inset-0 w-full h-full"
                    />
                  )}
                  <span className="absolute z-10 bottom-1 left-2 text-[10px] font-medium text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                    Fondo
                  </span>
                </div>
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none drop-shadow-md"
              style={{ left: scrubLeft }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
