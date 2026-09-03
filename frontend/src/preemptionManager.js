/**
 * Emergency Preemption Manager
 * Coordinates the emergency strobe banner, audio alarm beeps,
 * and dispatch log events.
 */

export class PreemptionManager {
  constructor() {
    this.banner = document.getElementById('emergency-banner');
    this.eventStream = document.getElementById('event-stream');
    this.active = false;
    this.audioCtx = null;
    this.audioMuted = false;
    this.lastLoggedState = null;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  setMuted(muted) {
    this.audioMuted = muted;
  }

  /**
   * Plays a brief tactical alert beep on preemption trigger
   */
  playAlertBeacon() {
    if (this.audioMuted || !this.audioCtx || this.audioCtx.state !== 'running') return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.audioCtx.currentTime + 0.15); // A6

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio beacon error:', e);
    }
  }

  /**
   * Updates preemption state
   * @param {boolean} shouldPreempt
   * @param {number} timestamp
   * @param {number} pFusion
   */
  update(shouldPreempt, timestamp = 0, pFusion = 0) {
    if (shouldPreempt && !this.active) {
      // Transition from normal to preemption
      this.active = true;
      if (this.banner) {
        this.banner.classList.remove('hidden');
      }
      this.playAlertBeacon();
      this.logEvent(
        timestamp,
        'preempt',
        `🚨 PREEMPTION ACTIVATED: P_fusion = ${pFusion.toFixed(3)} >= 0.75. Green corridor locked.`
      );
    } else if (!shouldPreempt && this.active) {
      // Transition from preemption back to normal
      this.active = false;
      if (this.banner) {
        this.banner.classList.add('hidden');
      }
      this.logEvent(
        timestamp,
        'info',
        `Standby: P_fusion = ${pFusion.toFixed(3)} < 0.75. Normal cyclic signal restored.`
      );
    }
  }

  /**
   * Append a line to the live event log
   */
  logEvent(timestamp, type, message) {
    if (!this.eventStream) return;
    const mins = Math.floor(timestamp / 60).toString().padStart(2, '0');
    const secs = (timestamp % 60).toFixed(2).padStart(5, '0');
    const timeStr = `[${mins}:${secs}]`;

    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = `${timeStr} ${message}`;

    this.eventStream.appendChild(line);
    // Limit to latest 50 logs
    while (this.eventStream.children.length > 50) {
      this.eventStream.removeChild(this.eventStream.firstChild);
    }
    this.eventStream.scrollTop = this.eventStream.scrollHeight;
  }
}
