// UI Elements
const video = document.getElementById('cameraFeed');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx = overlayCanvas.getContext('2d');
const valVision = document.getElementById('valVision');
const valAudio = document.getElementById('valAudio');
const valFusion = document.getElementById('valFusion');
const fillVision = document.querySelector('.vision-fill');
const fillAudio = document.querySelector('.audio-fill');
const fillFusion = document.querySelector('.fusion-fill');
const alertBox = document.getElementById('preemptionAlert');

// Traffic Light Elements
const tlRed = document.querySelector('.tl-red');
const tlYellow = document.querySelector('.tl-yellow');
const tlGreen = document.querySelector('.tl-green');
const tlStatus = document.getElementById('tlStatus');

// Audio Viz Elements
const audioCanvas = document.getElementById('audioCanvas');
const audioCtx = audioCanvas.getContext('2d');

let telemetryData = [];
let preemptionThreshold = 0.8;
let isPreempting = false;

// Initialize
async function init() {
    try {
        const response = await fetch('/data/telemetry.json');
        if (!response.ok) throw new Error('Telemetry not found');
        telemetryData = await response.json();
    } catch (e) {
        console.warn('Telemetry data missing or failed to load. Ensure Colab pipeline has run.', e);
        // Fallback for dummy display if no json
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initially set green light
    setTrafficLight('green');

    // Sync loop
    video.addEventListener('timeupdate', syncTelemetry);
    
    // Setup Audio Visualizer (mock random bars based on time or audio context)
    drawAudioViz();
}

function resizeCanvas() {
    // Match canvas size to video display size
    const rect = video.getBoundingClientRect();
    overlayCanvas.width = rect.width;
    overlayCanvas.height = rect.height;
    
    audioCanvas.width = audioCanvas.parentElement.clientWidth;
    audioCanvas.height = 100;
}

function setTrafficLight(state) {
    tlRed.classList.remove('active');
    tlYellow.classList.remove('active');
    tlGreen.classList.remove('active');

    if (state === 'red') {
        tlRed.classList.add('active');
        tlStatus.textContent = 'EMERGENCY PREEMPTION';
        tlStatus.classList.add('preempting');
        alertBox.classList.remove('hidden');
    } else if (state === 'green') {
        tlGreen.classList.add('active');
        tlStatus.textContent = 'NORMAL OPERATION';
        tlStatus.classList.remove('preempting');
        alertBox.classList.add('hidden');
    }
}

function syncTelemetry() {
    if (!telemetryData.length) return;

    const currentTime = video.currentTime;
    
    // Find closest frame data
    const frameData = telemetryData.find(d => d.timestamp >= currentTime);
    if (!frameData) return;

    updateGauges(frameData);
    drawBoundingBoxes(frameData);
    
    // Preemption Logic
    if (frameData.p_fusion > preemptionThreshold && !isPreempting) {
        isPreempting = true;
        setTrafficLight('red');
    } else if (frameData.p_fusion <= preemptionThreshold && isPreempting) {
        isPreempting = false;
        setTrafficLight('green');
    }
}

function updateGauges(data) {
    const update = (element, fill, value) => {
        const percent = Math.round(value * 100);
        element.textContent = `${percent}%`;
        // Dash array is 283. Dash offset goes from 283 (0%) to 0 (100%)
        const offset = 283 - (283 * value);
        fill.style.strokeDashoffset = offset;
    };

    update(valVision, fillVision, data.p_vision);
    update(valAudio, fillAudio, data.p_audio);
    update(valFusion, fillFusion, data.p_fusion);
}

function drawBoundingBoxes(data) {
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (!data.bounding_boxes || data.bounding_boxes.length === 0) return;

    // Assuming original video is 640x360 for scaling (adjust as needed based on actual video)
    const scaleX = overlayCanvas.width / 640; 
    const scaleY = overlayCanvas.height / 360;

    data.bounding_boxes.forEach(box => {
        // [x1, y1, x2, y2]
        const x = box[0] * scaleX;
        const y = box[1] * scaleY;
        const w = (box[2] - box[0]) * scaleX;
        const h = (box[3] - box[1]) * scaleY;

        // Draw Box
        ctx.strokeStyle = '#ef4444'; // Red for emergency
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Draw Label
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y - 25, w, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter';
        ctx.fillText(`AMBULANCE ${(data.p_vision*100).toFixed(0)}%`, x + 5, y - 8);
    });
}

function drawAudioViz() {
    // Simple visualizer animation loop
    requestAnimationFrame(drawAudioViz);
    
    if (video.paused || video.ended) return;

    const w = audioCanvas.width;
    const h = audioCanvas.height;
    
    audioCtx.clearRect(0, 0, w, h);
    
    // Draw dummy frequency bars based on audio probability if we can access it
    // Or just random for visual effect
    const bars = 40;
    const barWidth = w / bars - 2;
    
    // Get current fusion data for amplitude if available
    let amplitude = 0.2;
    if (telemetryData.length) {
        const frameData = telemetryData.find(d => d.timestamp >= video.currentTime);
        if (frameData) amplitude = frameData.p_audio;
    }

    for (let i = 0; i < bars; i++) {
        // Higher bars in middle, noise based on amplitude
        const distanceFromCenter = Math.abs((bars/2) - i) / (bars/2);
        const height = (1 - distanceFromCenter) * (h * 0.8 * amplitude) + (Math.random() * h * 0.2);
        
        audioCtx.fillStyle = `rgba(245, 158, 11, ${0.5 + amplitude * 0.5})`; // yellow
        audioCtx.fillRect(i * (w / bars), h - height, barWidth, height);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
