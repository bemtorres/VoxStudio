/**
 * Export episode entries as a single WAV file (merge in order by position).
 * Runs in the browser using Web Audio API.
 */

export type EntryForExport = { position: number; audio_file_path: string };

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = numChannels > 1 ? Math.max(-1, Math.min(1, right[i])) : l;
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    offset += 2;
    if (numChannels > 1) {
      view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportEpisodeAsWav(
  entries: EntryForExport[],
  filenameBase: string
): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const withAudio = sorted.filter((e) => e?.audio_file_path);
  if (withAudio.length === 0) {
    throw new Error('No hay entradas con audio para exportar');
  }

  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const decoded: { buffer: AudioBuffer }[] = [];

  for (const entry of withAudio) {
    const path = entry.audio_file_path.startsWith('/') ? entry.audio_file_path : `/${entry.audio_file_path}`;
    const res = await fetch(path);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    decoded.push({ buffer });
  }

  const sampleRate = decoded[0].buffer.sampleRate;
  const numChannels = Math.min(2, decoded[0].buffer.numberOfChannels);
  let totalLength = 0;
  for (const { buffer } of decoded) totalLength += buffer.length;

  const offline = new OfflineAudioContext(numChannels, totalLength, sampleRate);
  let startTime = 0;
  for (const { buffer } of decoded) {
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(startTime);
    startTime += buffer.duration;
  }

  const merged = await offline.startRendering();
  const wav = audioBufferToWav(merged);
  const filename = `${filenameBase.replace(/[^a-zA-Z0-9\u00C0-\u024F\-_\s]/g, '')}.wav`;
  triggerDownload(wav, filename);
}
