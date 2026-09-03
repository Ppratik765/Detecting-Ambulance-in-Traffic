/**
 * circular progress gauge controller for ITS Multimodal Sensor Fusion
 * Handles SVG stroke-dashoffset transitions and dynamic color thresholds
 */

const CIRCUMFERENCE = 2 * Math.PI * 48; // ~301.59px for r=48

export class GaugeController {
  constructor() {
    // Circle elements
    this.circleVision = document.getElementById('gauge-circle-vision');
    this.circleAudio = document.getElementById('gauge-circle-audio');
    this.circleFusion = document.getElementById('gauge-circle-fusion');

    // Value text elements
    this.valVision = document.getElementById('gauge-val-vision');
    this.valAudio = document.getElementById('gauge-val-audio');
    this.valFusion = document.getElementById('gauge-val-fusion');
    this.subFusion = document.getElementById('gauge-sub-fusion');

    // Container
    this.fusionItem = document.querySelector('.gauge-item-fusion');

    this.init();
  }

  init() {
    if (this.circleVision) this.circleVision.style.strokeDasharray = `${CIRCUMFERENCE}`;
    if (this.circleAudio) this.circleAudio.style.strokeDasharray = `${CIRCUMFERENCE}`;
    if (this.circleFusion) this.circleFusion.style.strokeDasharray = `${CIRCUMFERENCE}`;
    this.update(0, 0, 0, false);
  }

  /**
   * Update all three gauges with current frame telemetry
   * @param {number} pVision - [0, 1]
   * @param {number} pAudio - [0, 1]
   * @param {number} pFusion - [0, 1]
   * @param {boolean} preemptionActive - boolean
   */
  update(pVision, pAudio, pFusion, preemptionActive) {
    const v = Math.max(0, Math.min(1, pVision || 0));
    const a = Math.max(0, Math.min(1, pAudio || 0));
    const f = Math.max(0, Math.min(1, pFusion || 0));

    // Update Vision Gauge
    if (this.circleVision) {
      const offsetV = CIRCUMFERENCE * (1 - v);
      this.circleVision.style.strokeDashoffset = offsetV.toFixed(1);
    }
    if (this.valVision) {
      this.valVision.textContent = `${Math.round(v * 100)}%`;
    }

    // Update Audio Gauge
    if (this.circleAudio) {
      const offsetA = CIRCUMFERENCE * (1 - a);
      this.circleAudio.style.strokeDashoffset = offsetA.toFixed(1);
    }
    if (this.valAudio) {
      this.valAudio.textContent = `${Math.round(a * 100)}%`;
    }

    // Update Fusion Probability Gauge
    if (this.circleFusion) {
      const offsetF = CIRCUMFERENCE * (1 - f);
      this.circleFusion.style.strokeDashoffset = offsetF.toFixed(1);

      // Dynamic Class Coloring
      this.circleFusion.classList.remove('warn', 'danger');
      if (f >= 0.75 || preemptionActive) {
        this.circleFusion.classList.add('danger');
      } else if (f >= 0.45) {
        this.circleFusion.classList.add('warn');
      }
    }

    if (this.valFusion) {
      this.valFusion.textContent = f.toFixed(2);
      if (f >= 0.75 || preemptionActive) {
        this.valFusion.classList.add('danger');
      } else {
        this.valFusion.classList.remove('danger');
      }
    }

    if (this.subFusion) {
      if (preemptionActive || f >= 0.75) {
        this.subFusion.textContent = '[ALERT] TRIGGERED';
        this.subFusion.style.color = '#ef4444';
      } else if (f >= 0.45) {
        this.subFusion.textContent = 'CAUTION';
        this.subFusion.style.color = '#f59e0b';
      } else {
        this.subFusion.textContent = 'STANDBY';
        this.subFusion.style.color = '#64748b';
      }
    }

    if (this.fusionItem) {
      if (preemptionActive || f >= 0.75) {
        this.fusionItem.classList.add('preemption-triggered');
      } else {
        this.fusionItem.classList.remove('preemption-triggered');
      }
    }
  }
}
