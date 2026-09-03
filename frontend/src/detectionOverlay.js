/**
 * Real-time YOLOv8 Bounding Box Canvas Overlay
 * Maps telemetry bounding boxes [x1, y1, x2, y2] from native video resolution (1280x720)
 * to actual rendered canvas dimensions with high-tech tactical HUD aesthetics.
 */

export class DetectionOverlay {
  constructor(canvasId = 'detection-canvas', videoId = 'video-player') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.video = document.getElementById(videoId);

    this.hudTargetText = document.getElementById('hud-target-text');
    this.hudBoxCount = document.getElementById('hud-box-count');

    // Default native coordinate resolution from telemetry
    this.nativeWidth = 1280;
    this.nativeHeight = 720;

    this.currentDetections = [];
    this.isEmergencyActive = false;

    this.initResize();
  }

  setNativeDimensions(w, h) {
    if (w > 0) this.nativeWidth = w;
    if (h > 0) this.nativeHeight = h;
  }

  initResize() {
    if (!this.canvas || !this.video) return;

    const resize = () => {
      const rect = this.video.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.render();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(this.video);
    window.addEventListener('resize', resize);
    this.video.addEventListener('loadedmetadata', resize);
  }

  /**
   * Update detections list for the current video frame
   * @param {Array} detections - list of { class, confidence, bbox: [x1, y1, x2, y2] }
   * @param {boolean} preemptionActive - boolean
   */
  update(detections = [], preemptionActive = false) {
    this.currentDetections = detections;
    this.isEmergencyActive = preemptionActive;

    if (this.hudBoxCount) {
      this.hudBoxCount.textContent = detections.length.toString();
    }

    if (this.hudTargetText) {
      const hasEmergency = detections.some(d => d.class === 'truck' || d.is_emergency);
      if (preemptionActive || hasEmergency) {
        this.hudTargetText.textContent = '[AMBULANCE] (CORRIDOR PRIORITY)';
        this.hudTargetText.className = 'target-emergency';
      } else if (detections.length > 0) {
        this.hudTargetText.textContent = 'CIVILIAN TRAFFIC DETECTED';
        this.hudTargetText.className = '';
      } else {
        this.hudTargetText.textContent = 'SCANNING...';
        this.hudTargetText.className = '';
      }
    }

    this.render();
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    if (!this.currentDetections || this.currentDetections.length === 0) return;

    const scaleX = width / this.nativeWidth;
    const scaleY = height / this.nativeHeight;

    for (const det of this.currentDetections) {
      const [x1, y1, x2, y2] = det.bbox;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      const isEmergency = det.class === 'truck' || det.is_emergency || this.isEmergencyActive;
      const color = isEmergency ? '#ef4444' : '#00f2fe';
      const glowColor = isEmergency ? 'rgba(239, 68, 68, 0.7)' : 'rgba(0, 242, 254, 0.5)';
      const labelText = isEmergency ? 'EMERGENCY / AMBULANCE' : det.class.toUpperCase();
      const confPct = Math.round((det.confidence || 0.85) * 100);

      ctx.save();

      // Semi-transparent box interior
      ctx.fillStyle = isEmergency ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 242, 254, 0.08)';
      ctx.fillRect(bx, by, bw, bh);

      // Box border with subtle dash
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Tactical Corner Brackets
      const cornerLen = Math.min(14, bw * 0.25, bh * 0.25);
      ctx.lineWidth = 3;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = color;

      // Top-Left Corner
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // Top-Right Corner
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Bottom-Left Corner
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();

      // Bottom-Right Corner
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      // Center crosshair
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      // Label Tag Badge above box
      const tagText = `${labelText} ${confPct}%`;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(tagText).width;
      const tagH = 18;
      const tagY = Math.max(0, by - tagH - 3);

      ctx.fillStyle = isEmergency ? '#b91c1c' : '#0369a1';
      ctx.fillRect(bx, tagY, textWidth + 12, tagH);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, tagY, textWidth + 12, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(tagText, bx + 6, tagY + 13);

      ctx.restore();
    }
  }
}
