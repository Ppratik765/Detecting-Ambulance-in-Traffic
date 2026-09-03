/**
 * Web Audio API Waveform & Spectrogram Visualizer
 * Connects directly to the video element's audio output stream.
 * Computes frequency spectrum & waveform, highlighting emergency siren band (700-1600Hz).
 */

export class AudioVisualizer {
  constructor(canvasId = 'audio-visualizer-canvas', videoElement = null) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.video = videoElement || document.getElementById('video-player');
    this.lockBadge = document.getElementById('audio-lock-badge');

    this.audioCtx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.isInitialized = false;

    this.dataArray = null;
    this.bufferLength = 0;
    this.animationId = null;

    // Simulated fallback energy when audio context is not yet running
    this.currentAudioConfidence = 0;

    this.initCanvasResize();
  }

  initCanvasResize() {
    if (!this.canvas) return;
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  /**
   * Initializes Web Audio Context on user gesture or playback start
   */
  async connectAudio() {
    if (this.isInitialized || !this.video) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect video -> analyser -> destination
      this.sourceNode = this.audioCtx.createMediaElementSource(this.video);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.isInitialized = true;
      console.log('🔊 Web Audio API successfully connected to video stream.');
    } catch (err) {
      console.warn('Web Audio API connection notice (will use fallback):', err);
    }
  }

  /**
   * Resume audio context if suspended by browser autoplay policy
   */
  async resumeContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Called on every animation/video frame to update visualization
   * @param {number} pAudio - current audio confidence from telemetry
   */
  update(pAudio = 0) {
    this.currentAudioConfidence = pAudio;
  }

  start() {
    const draw = () => {
      this.drawFrame();
      this.animationId = requestAnimationFrame(draw);
    };
    this.animationId = requestAnimationFrame(draw);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  drawFrame() {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Siren band highlight region (700Hz - 1600Hz)
    // For 44100Hz / 512 bins, each bin is ~86.1 Hz.
    // 700Hz is approx bin 8; 1600Hz is approx bin 19.
    const startX = width * 0.22;
    const endX = width * 0.58;

    ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.fillRect(startX, 0, endX - startX, height);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(startX, 0, endX - startX, height);
    ctx.setLineDash([]);

    // Check if real Web Audio is active
    let hasRealData = false;
    if (this.analyser && this.dataArray && this.audioCtx && this.audioCtx.state === 'running' && !this.video.muted) {
      this.analyser.getByteFrequencyData(this.dataArray);
      // Verify non-zero values
      for (let i = 0; i < this.bufferLength; i++) {
        if (this.dataArray[i] > 5) {
          hasRealData = true;
          break;
        }
      }
    }

    const barCount = 48;
    const barWidth = (width / barCount) - 2;
    let sirenEnergy = 0;

    for (let i = 0; i < barCount; i++) {
      let val = 0;

      if (hasRealData) {
        const binIdx = Math.floor((i / barCount) * (this.bufferLength * 0.6));
        val = this.dataArray[binIdx] / 255.0;
      } else {
        // Fallback procedural waveform driven by telemetry pAudio & time
        const now = performance.now() / 1000;
        const isSirenBin = (i >= 11 && i <= 28);
        const wave1 = Math.sin(now * 12 + i * 0.4) * 0.5 + 0.5;
        const wave2 = Math.cos(now * 8 + i * 0.2) * 0.5 + 0.5;

        if (isSirenBin) {
          val = this.currentAudioConfidence * (0.6 + 0.4 * wave1);
        } else {
          val = Math.max(0.04, (1 - this.currentAudioConfidence * 0.5) * (0.05 + 0.15 * wave2));
        }
      }

      const barX = i * (barWidth + 2);
      const isSirenZone = barX >= startX && barX <= endX;
      if (isSirenZone) sirenEnergy += val;

      const barHeight = Math.max(3, val * (height - 18));
      const barY = height - barHeight - 4;

      // Color coding: Cyan for normal, Neon Violet/Magenta for Siren band
      if (isSirenZone && val > 0.4) {
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = 'rgba(192, 132, 252, 0.8)';
        ctx.shadowBlur = 8;
      } else if (isSirenZone) {
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#0284c7';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Siren Lock status badge update
    const avgSirenVal = sirenEnergy / 18;
    const isLocked = avgSirenVal > 0.45 || this.currentAudioConfidence > 0.65;

    if (this.lockBadge) {
      if (isLocked) {
        this.lockBadge.textContent = '🚨 HARMONIC LOCK (SIREN ACTIVE)';
        this.lockBadge.className = 'badge badge-preempt';
      } else {
        this.lockBadge.textContent = 'NO HARMONIC LOCK';
        this.lockBadge.className = 'badge badge-muted';
      }
    }
  }
}
