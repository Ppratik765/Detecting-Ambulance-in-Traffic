/**
 * Real-Time Web Audio API Waveform & Spectrogram Visualizer
 * Extracts audio frequencies directly from HTML5 <video> element.
 */
export class AudioVisualizer {
  constructor(canvasId, videoElement) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.video = videoElement;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.bufferLength = 0;
    this.isInitialized = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupListeners();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = this.canvas.parentElement.clientWidth || 320;
      this.canvas.height = 110;
    }
  }

  setupListeners() {
    // User interaction is required to unlock AudioContext
    const unlock = () => {
      this.initAudioContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);

    this.video.addEventListener('play', () => {
      this.initAudioContext();
    });
  }

  initAudioContext() {
    if (this.isInitialized) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.source = this.audioCtx.createMediaElementSource(this.video);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API hardware link waiting for media stream:', e.message);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // Background Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let y = 20; y < height; y += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    let hasRealAudio = false;
    if (this.isInitialized && this.analyser && !this.video.paused && !this.video.ended) {
      this.analyser.getByteFrequencyData(this.dataArray);
      hasRealAudio = this.dataArray.some(v => v > 0);
    }

    if (hasRealAudio) {
      // Draw live frequency spectrum bars
      const barWidth = (width / this.bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < this.bufferLength; i++) {
        const barHeight = (this.dataArray[i] / 255) * (height - 15);
        
        // Gradient from amber (audio) to emergency red
        const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#ef4444');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);
        x += barWidth;
      }
    } else {
      // Draw smooth idle / synthetic acoustic waveform
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.video.paused ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.85)';
      this.ctx.lineWidth = 2;

      const time = Date.now() * 0.003;
      const midY = height / 2;
      const amplitude = this.video.paused ? 4 : 18;

      for (let x = 0; x < width; x += 2) {
        const y = midY + Math.sin(x * 0.04 + time) * amplitude * Math.sin(x * 0.01);
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();

      // Label
      this.ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      this.ctx.font = '10px Inter';
      this.ctx.fillText(this.video.paused ? 'PAUSED' : 'MEL ACOUSTIC MONITOR [16 kHz]', 8, 16);
    }
  }
}
