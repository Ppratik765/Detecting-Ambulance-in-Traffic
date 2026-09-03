/**
 * ITS Audio-Visual Sensor Fusion Command Center - Master Synchronization Engine
 * Connects video playback & timeline scrubbing directly with:
 * - Telemetry Frame Lookup (Binary Search)
 * - YOLO Detection Canvas Overlay
 * - Multimodal Circular Gauges
 * - SVG 4-Way Traffic Light Controller
 * - Web Audio Waveform Analyzer
 * - Emergency Preemption Alarm System
 */

import { GaugeController } from './gauges.js';
import { TrafficLightController } from './trafficLight.js';
import { AudioVisualizer } from './visualizer.js';
import { DetectionOverlay } from './detectionOverlay.js';
import { PreemptionManager } from './preemptionManager.js';

class AppSyncEngine {
  constructor() {
    this.telemetry = null;
    this.frames = [];
    this.fps = 30;
    this.duration = 30;

    // DOM Elements
    this.video = document.getElementById('video-player');
    this.playBtn = document.getElementById('btn-play-pause');
    this.playIcon = document.getElementById('play-pause-icon');
    this.playOverlayBtn = document.getElementById('video-play-overlay-btn');
    this.restartBtn = document.getElementById('btn-restart');
    this.jumpSirenBtn = document.getElementById('btn-jump-siren');
    this.scrubber = document.getElementById('timeline-scrubber');
    this.timelineProgress = document.getElementById('timeline-progress');
    this.currentTimeReadout = document.getElementById('current-time-readout');
    this.durationReadout = document.getElementById('duration-readout');
    this.masterTimecode = document.getElementById('master-timecode');
    this.fpsDisplay = document.getElementById('video-fps-display');
    this.speedSelect = document.getElementById('playback-speed-select');
    this.muteBtn = document.getElementById('btn-audio-mute');
    this.muteIcon = document.getElementById('mute-icon');
    this.forcePreemptBtn = document.getElementById('btn-force-preempt');
    this.resetSignalBtn = document.getElementById('btn-reset-signal');
    this.audioNotice = document.getElementById('audio-notice');

    // Subsystem Controllers
    this.gauges = new GaugeController();
    this.trafficLight = new TrafficLightController('traffic-light-container');
    this.detectionOverlay = new DetectionOverlay('detection-canvas', 'video-player');
    this.preemptionManager = new PreemptionManager();
    this.visualizer = new AudioVisualizer('audio-visualizer-canvas', this.video);

    this.isScrubbing = false;
    this.manualPreemptActive = false;

    this.init();
  }

  async init() {
    console.log('🚀 Initializing ITS Audio-Visual Fusion Command Center...');
    await this.loadTelemetry();
    this.setupEventListeners();
    this.visualizer.start();
    this.syncFrame(0);
    this.updatePlayheadUI(0);
  }

  async loadTelemetry() {
    try {
      const res = await fetch('/data/telemetry.json');
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching telemetry.json`);
      this.telemetry = await res.json();
      this.frames = this.telemetry.frames || [];

      if (this.telemetry.meta) {
        this.fps = this.telemetry.meta.fps || 30;
        this.duration = this.telemetry.meta.duration_seconds || (this.frames.length / this.fps) || 30;
        if (this.fpsDisplay) this.fpsDisplay.textContent = `${Math.round(this.fps)} FPS`;
        if (this.telemetry.meta.video_width && this.telemetry.meta.video_height) {
          this.detectionOverlay.setNativeDimensions(
            this.telemetry.meta.video_width,
            this.telemetry.meta.video_height
          );
        }
      }

      if (this.scrubber) {
        this.scrubber.max = this.duration.toString();
      }
      this.formatDuration(this.duration);

      this.preemptionManager.logEvent(
        0,
        'info',
        `Telemetry loaded: ${this.frames.length} frames (${this.duration.toFixed(1)}s). Ready.`
      );
    } catch (err) {
      console.error('Failed to load telemetry.json:', err);
      this.preemptionManager.logEvent(
        0,
        'warn',
        `Telemetry warning: ${err.message}. Using fallback generator.`
      );
    }
  }

  /**
   * Fast O(log N) binary search for the closest frame at time t
   */
  findClosestFrame(time) {
    if (!this.frames || this.frames.length === 0) return null;
    let low = 0;
    let high = this.frames.length - 1;

    if (time <= this.frames[0].timestamp) return this.frames[0];
    if (time >= this.frames[high].timestamp) return this.frames[high];

    while (low <= high) {
      const mid = (low + high) >> 1;
      const tMid = this.frames[mid].timestamp;

      if (tMid === time) return this.frames[mid];
      if (tMid < time) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Pick closest between low and high
    const idx = (low < this.frames.length &&
      Math.abs(this.frames[low].timestamp - time) < Math.abs(this.frames[high].timestamp - time))
      ? low
      : high;

    return this.frames[idx] || this.frames[0];
  }

  /**
   * Synchronizes all dashboard subsystems to a specific timestamp
   */
  syncFrame(currentTime) {
    const frame = this.findClosestFrame(currentTime);
    const pVision = frame ? frame.p_vision : 0;
    const pAudio = frame ? frame.p_audio : 0;
    const pFusion = frame ? frame.p_fusion : 0;
    const preemption = this.manualPreemptActive || (frame ? frame.preemption_active : false);
    const detections = frame ? frame.detections : [];

    // 1. Update Circular Gauges
    this.gauges.update(pVision, pAudio, pFusion, preemption);

    // 2. Update Adaptive Signal Light
    this.trafficLight.update(currentTime, preemption);

    // 3. Update Video YOLO Canvas Overlay
    this.detectionOverlay.update(detections, preemption);

    // 4. Update Audio Visualizer
    this.visualizer.update(pAudio);

    // 5. Update Preemption Manager (Banner & Beep)
    this.preemptionManager.update(preemption, currentTime, pFusion);

    // 6. Update Header & Timecodes
    this.updateTimeDisplay(currentTime);
  }

  updateTimeDisplay(currentTime) {
    const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
    const secs = (currentTime % 60).toFixed(2).padStart(5, '0');
    const timeStr = `${mins}:${secs}`;

    if (this.currentTimeReadout) this.currentTimeReadout.textContent = timeStr;
    if (this.masterTimecode) this.masterTimecode.textContent = timeStr;
  }

  formatDuration(dur) {
    const mins = Math.floor(dur / 60).toString().padStart(2, '0');
    const secs = (dur % 60).toFixed(2).padStart(5, '0');
    if (this.durationReadout) this.durationReadout.textContent = `${mins}:${secs}`;
  }

  updatePlayheadUI(currentTime) {
    if (this.scrubber && !this.isScrubbing) {
      this.scrubber.value = currentTime.toString();
    }
    if (this.timelineProgress) {
      const pct = (currentTime / this.duration) * 100;
      this.timelineProgress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
  }

  setupEventListeners() {
    // Video Playback Loop: use requestVideoFrameCallback for 60Hz precision if available
    const onFrame = () => {
      if (!this.video.paused && !this.video.ended) {
        const t = this.video.currentTime;
        this.syncFrame(t);
        this.updatePlayheadUI(t);

        if ('requestVideoFrameCallback' in this.video) {
          this.video.requestVideoFrameCallback(onFrame);
        } else {
          requestAnimationFrame(onFrame);
        }
      }
    };

    this.video.addEventListener('play', () => {
      this.playIcon.textContent = '⏸';
      this.playOverlayBtn.classList.add('hidden');
      this.visualizer.connectAudio();
      this.visualizer.resumeContext();
      this.preemptionManager.initAudio();

      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback(onFrame);
      } else {
        requestAnimationFrame(onFrame);
      }
    });

    this.video.addEventListener('pause', () => {
      this.playIcon.textContent = '▶';
      this.playOverlayBtn.classList.remove('hidden');
    });

    this.video.addEventListener('ended', () => {
      this.playIcon.textContent = '▶';
      this.playOverlayBtn.classList.remove('hidden');
      this.syncFrame(this.duration);
    });

    // Fallback sync on standard timeupdate
    this.video.addEventListener('timeupdate', () => {
      if (!this.isScrubbing) {
        const t = this.video.currentTime;
        this.syncFrame(t);
        this.updatePlayheadUI(t);
      }
    });

    // Play / Pause toggles
    const togglePlay = () => {
      this.visualizer.connectAudio();
      this.visualizer.resumeContext();
      if (this.video.paused || this.video.ended) {
        this.video.play().catch(e => console.warn('Play interrupted:', e));
      } else {
        this.video.pause();
      }
    };

    if (this.playBtn) this.playBtn.addEventListener('click', togglePlay);
    if (this.playOverlayBtn) this.playOverlayBtn.addEventListener('click', togglePlay);

    // Keyboard Space shortcut
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        togglePlay();
      }
    });

    // Restart button
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        this.video.currentTime = 0;
        this.syncFrame(0);
        this.updatePlayheadUI(0);
      });
    }

    // Jump to siren preemption event (t = 9.5s)
    if (this.jumpSirenBtn) {
      this.jumpSirenBtn.addEventListener('click', () => {
        this.video.currentTime = 9.5;
        this.syncFrame(9.5);
        this.updatePlayheadUI(9.5);
        this.preemptionManager.logEvent(
          9.5,
          'warn',
          'Fast-seek to Siren Detection Event (t=9.50s).'
        );
      });
    }

    // Timeline Scrubbing
    if (this.scrubber) {
      const handleScrub = () => {
        const t = parseFloat(this.scrubber.value);
        this.video.currentTime = t;
        this.syncFrame(t);
        this.updatePlayheadUI(t);
      };

      this.scrubber.addEventListener('input', () => {
        this.isScrubbing = true;
        handleScrub();
      });

      this.scrubber.addEventListener('change', () => {
        this.isScrubbing = false;
        handleScrub();
      });
    }

    // Playback Speed
    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        this.video.playbackRate = speed;
      });
    }

    // Audio Mute Toggle
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        this.video.muted = !this.video.muted;
        this.muteIcon.textContent = this.video.muted ? '🔇' : '🔊';
        this.preemptionManager.setMuted(this.video.muted);
        this.visualizer.connectAudio();
        this.visualizer.resumeContext();
      });
    }

    // Manual Overrides
    if (this.forcePreemptBtn) {
      this.forcePreemptBtn.addEventListener('click', () => {
        this.manualPreemptActive = !this.manualPreemptActive;
        this.trafficLight.setManualOverride(this.manualPreemptActive);
        this.syncFrame(this.video.currentTime);

        if (this.manualPreemptActive) {
          this.forcePreemptBtn.textContent = '❌ CANCEL OVERRIDE';
          this.forcePreemptBtn.className = 'btn btn-sm btn-outline';
          this.preemptionManager.logEvent(
            this.video.currentTime,
            'preempt',
            'MANUAL DISPATCH OVERRIDE: Emergency corridor forced ON.'
          );
        } else {
          this.forcePreemptBtn.textContent = '🚨 FORCE PREEMPTION';
          this.forcePreemptBtn.className = 'btn btn-sm btn-danger';
          this.preemptionManager.logEvent(
            this.video.currentTime,
            'info',
            'Manual dispatch override cleared.'
          );
        }
      });
    }

    if (this.resetSignalBtn) {
      this.resetSignalBtn.addEventListener('click', () => {
        this.manualPreemptActive = false;
        this.trafficLight.setManualOverride(false);
        if (this.forcePreemptBtn) {
          this.forcePreemptBtn.textContent = '🚨 FORCE PREEMPTION';
          this.forcePreemptBtn.className = 'btn btn-sm btn-danger';
        }
        this.syncFrame(this.video.currentTime);
        this.preemptionManager.logEvent(
          this.video.currentTime,
          'info',
          'Signal controller manually reset to normal cycle.'
        );
      });
    }

    // Audio user interaction hint
    const dismissAudioNotice = () => {
      this.visualizer.connectAudio();
      this.visualizer.resumeContext();
      this.preemptionManager.initAudio();
      if (this.audioNotice) this.audioNotice.classList.add('hidden');
      window.removeEventListener('click', dismissAudioNotice);
    };
    window.addEventListener('click', dismissAudioNotice);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.appSyncEngine = new AppSyncEngine();
});
