class AshLiveMic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameLength = Math.round(sampleRate / 50);
    this.frame = new Int16Array(this.frameLength);
    this.offset = 0;
    this.sum = 0;
  }

  process(inputs) {
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    for (const value of samples) {
      this.sum += value * value;
      this.frame[this.offset++] = Math.max(-1, Math.min(1, value)) * 32767;
      if (this.offset === this.frameLength) {
        this.port.postMessage({ pcm: this.frame, rms: Math.sqrt(this.sum / this.frameLength) }, [this.frame.buffer]);
        this.frame = new Int16Array(this.frameLength);
        this.offset = 0;
        this.sum = 0;
      }
    }
    return true;
  }
}

registerProcessor('ash-live-mic', AshLiveMic);
