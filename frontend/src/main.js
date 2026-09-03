import './style.css';
import { TrafficLightController } from './trafficLight.js';
import { AudioVisualizer } from './visualizer.js';

// DOM Elements
const video = document.getElementById('ambulanceVideo');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx = overlayCanvas.getContext('2d');
const banner = document.getElementById('emergencyBanner');
const feedTimeDisplay = document.getElementById('feedTimeDisplay');
const frameIndexDisplay = document.getElementById('frameIndexDisplay');

// Gauges
const valVision = document.getElementById('gaugeValVision');
const valAudio = document.getElementById('gaugeValAudio');
const valFusion = document.getElementById('gaugeValFusion');
const circleVision = document.getElementById('gaugeProgVision');
const circleAudio = document.getElementById('gaugeProgAudio');
const circleFusion = document.getElementById('gaugeProgFusion');

// Play/Pause & Mute buttons
const btnTogglePlay = document.getElementById('btnTogglePlay');
const btnToggleMute = document.getElementById('btnToggleMute');

// State
let telemetry = { meta: { fps: 30 }, frames: [] };
let trafficController = null;
let visualizer = null;

// Initialize Dashboard
async function initDashboard() {
  trafficController = new TrafficLightController('trafficSignalMount', 'emergencyBanner');
  visualizer = new AudioVisualizer('audioVisualizer', video);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load Telemetry from Colab Export
  try {
    const res = await fetch('/data/telemetry.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Fallback in case of flat list format
        telemetry = { meta: { fps: 30 }, frames: data };
      } else {
        telemetry = data;
      }
      console.log(`Loaded ${telemetry.frames?.length || 0} telemetry frames.`);
    } else {
      console.warn('Telemetry data not found at /data/telemetry.json');
    }
  } catch (err) {
    console.error('Failed to parse telemetry:', err);
  }

  // Setup Event Listeners for Frame Sync
  video.addEventListener('timeupdate', onFrameUpdate);
  video.addEventListener('seeked', onFrameUpdate);
  video.addEventListener('play', () => {
    btnTogglePlay.textContent = 'PAUSE';
  });
  video.addEventListener('pause', () => {
    btnTogglePlay.textContent = 'PLAY';
  });

  btnTogglePlay.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  btnToggleMute.addEventListener('click', () => {
    video.muted = !video.muted;
    btnToggleMute.textContent = video.muted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
  });

  // Run initial sync
  onFrameUpdate();
}

function resizeCanvas() {
  if (!overlayCanvas || !video) return;
  const rect = video.getBoundingClientRect();
  overlayCanvas.width = rect.width;
  overlayCanvas.height = rect.height;
}

// Find telemetry frame corresponding to current playback time
function getFrameForTime(currentTime) {
  if (!telemetry.frames || telemetry.frames.length === 0) return null;
  
  // Binary search for exact or closest preceding timestamp
  let low = 0;
  let high = telemetry.frames.length - 1;
  let bestIdx = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const frame = telemetry.frames[mid];
    if (frame.timestamp <= currentTime) {
      bestIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return telemetry.frames[bestIdx];
}

function onFrameUpdate() {
  const currentTime = video.currentTime;
  const frame = getFrameForTime(currentTime);

  // Update timestamps
  if (feedTimeDisplay) {
    feedTimeDisplay.textContent = `${currentTime.toFixed(2)}s`;
  }
  if (frameIndexDisplay && frame) {
    frameIndexDisplay.textContent = `FRAME #${frame.frame}`;
  }

  if (!frame) return;

  // 1. Update Gauges
  updateGauge(circleVision, valVision, frame.p_vision || 0);
  updateGauge(circleAudio, valAudio, frame.p_audio || 0);
  updateGauge(circleFusion, valFusion, frame.p_fusion || 0);

  // 2. Draw YOLO Bounding Boxes on Overlay Canvas
  drawBoundingBox(frame);

  // 3. Update Adaptive Traffic Signal
  if (trafficController) {
    trafficController.update(Boolean(frame.preemption), currentTime);
  }
}

function updateGauge(circleElement, valueElement, prob) {
  const percentage = Math.round(prob * 100);
  if (valueElement) {
    valueElement.textContent = `${percentage}%`;
  }
  if (circleElement) {
    // Circumference: 2 * Math.PI * 35 = 219.91 (~220)
    const offset = 220 - (220 * Math.max(0, Math.min(1, prob)));
    circleElement.style.strokeDashoffset = offset;
  }
}

function drawBoundingBox(frame) {
  if (!ctx || !overlayCanvas) return;
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  const bbox = frame.bbox || (frame.bounding_boxes && frame.bounding_boxes[0]);
  if (!bbox || bbox.length < 4) return;

  // Expected native video resolution (1280x720 or 1920x1080)
  const videoWidth = video.videoWidth || 1280;
  const videoHeight = video.videoHeight || 720;
  
  const scaleX = overlayCanvas.width / videoWidth;
  const scaleY = overlayCanvas.height / videoHeight;

  const [x1, y1, x2, y2] = bbox;
  const bx = x1 * scaleX;
  const by = y1 * scaleY;
  const bw = (x2 - x1) * scaleX;
  const bh = (y2 - y1) * scaleY;

  // Glowing Bounding Box
  ctx.save();
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.restore();

  // Corner Accents
  const cornerLen = 14;
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 4;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(bx, by + cornerLen);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + cornerLen, by);
  ctx.stroke();

  // Label Badge
  ctx.fillStyle = '#ef4444';
  const labelText = `AMBULANCE ${((frame.p_vision || 0) * 100).toFixed(0)}%`;
  ctx.font = '700 12px Inter, sans-serif';
  const textWidth = ctx.measureText(labelText).width;
  
  ctx.fillRect(bx, Math.max(0, by - 22), textWidth + 14, 22);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(labelText, bx + 7, Math.max(15, by - 7));
}

// Start
document.addEventListener('DOMContentLoaded', initDashboard);
