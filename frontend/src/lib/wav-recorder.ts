export type RecordedAudio = {
  blob: Blob;
  fileName: string;
  previewUrl: string;
  durationLabel: string;
};

type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("이 브라우저는 마이크 접근을 지원하지 않습니다.");
    }

    const AudioContextCtor = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("이 브라우저는 AudioContext를 지원하지 않습니다.");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContextCtor({ sampleRate: 24000 });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.startedAt = performance.now();
    this.chunks = [];

    this.processorNode.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(channel));
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  async stop(): Promise<RecordedAudio> {
    if (!this.audioContext || !this.processorNode) {
      throw new Error("녹음 세션이 시작되지 않았습니다.");
    }

    const sampleRate = this.audioContext.sampleRate;
    this.processorNode.disconnect();
    this.sourceNode?.disconnect();
    this.gainNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    await this.audioContext.close();

    const merged = mergeChunks(this.chunks);
    const wav = encodeWav(merged, sampleRate);
    const blob = new Blob([wav], { type: "audio/wav" });
    const durationSeconds = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));

    this.disposeInternal();

    return {
      blob,
      fileName: `question-${Date.now()}.wav`,
      previewUrl: URL.createObjectURL(blob),
      durationLabel: `${durationSeconds}초 질문 음성`,
    };
  }

  dispose() {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    void this.audioContext?.close();
    this.disposeInternal();
  }

  private disposeInternal() {
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.gainNode = null;
    this.chunks = [];
    this.startedAt = 0;
  }
}

function mergeChunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
