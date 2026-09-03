/**
 * Adaptive 4-Way Intersection Signal Controller
 * Simulates intelligent preemption: locks emergency approach to GREEN, switches conflicting lanes to RED.
 */
export class TrafficLightController {
  constructor(containerId, bannerId) {
    this.container = document.getElementById(containerId);
    this.banner = document.getElementById(bannerId);
    this.isPreempting = false;
    this.normalPhase = 0; // 0: N/S Green, 1: N/S Yellow, 2: E/W Green, 3: E/W Yellow
    this.initSVG();
  }

  initSVG() {
    this.container.innerHTML = `
      <div class="intersection-wrapper">
        <div class="intersection-header">
          <span class="junction-id">JUNCTION #402 — METRO CORRIDOR</span>
          <span class="signal-mode" id="signalModeBadge">ADAPTIVE MODE</span>
        </div>
        
        <svg viewBox="0 0 360 360" class="intersection-svg">
          <!-- Asphalt Intersection -->
          <rect x="0" y="0" width="360" height="360" fill="#0b1120" />
          
          <!-- Road Cross -->
          <rect x="130" y="0" width="100" height="360" fill="#1e293b" />
          <rect x="0" y="130" width="360" height="100" fill="#1e293b" />
          
          <!-- Lane Markings (Dashed Yellow) -->
          <line x1="180" y1="0" x2="180" y2="120" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,6" />
          <line x1="180" y1="240" x2="180" y2="360" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,6" />
          <line x1="0" y1="180" x2="120" y2="180" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,6" />
          <line x1="240" y1="180" x2="360" y2="180" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,6" />
          
          <!-- Pedestrian Crosswalks -->
          <g stroke="#ffffff" stroke-width="3" opacity="0.3">
            <line x1="135" y1="125" x2="225" y2="125" stroke-dasharray="5,5" />
            <line x1="135" y1="235" x2="225" y2="235" stroke-dasharray="5,5" />
            <line x1="125" y1="135" x2="125" y2="225" stroke-dasharray="5,5" />
            <line x1="235" y1="135" x2="235" y2="225" stroke-dasharray="5,5" />
          </g>

          <!-- Emergency Corridor Path (East -> West) -->
          <path id="corridorArrow" d="M 330 180 L 30 180" stroke="#ef4444" stroke-width="6" stroke-dasharray="10,6" opacity="0" class="corridor-path">
            <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="1s" repeatCount="indefinite" />
          </path>
          
          <!-- Center Junction Box -->
          <rect x="130" y="130" width="100" height="100" fill="#0f172a" stroke="#334155" stroke-width="1.5" rx="4" />
          <text x="180" y="184" text-anchor="middle" fill="#64748b" font-size="11" font-weight="700">PREEMPTION<tspan x="180" dy="14" font-size="9" fill="#475569">CONTROLLER</tspan></text>

          <!-- 4 Traffic Signal Heads -->
          <!-- NORTH SIGNAL (Conflicting) -->
          <g transform="translate(85, 20)">
            <rect x="0" y="0" width="34" height="76" rx="6" fill="#020617" stroke="#334155" stroke-width="1.5" />
            <circle id="sigN_Red" cx="17" cy="16" r="8" fill="#334155" />
            <circle id="sigN_Yel" cx="17" cy="38" r="8" fill="#334155" />
            <circle id="sigN_Grn" cx="17" cy="60" r="8" fill="#334155" />
            <text x="17" y="-5" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">NORTH</text>
          </g>

          <!-- SOUTH SIGNAL (Conflicting) -->
          <g transform="translate(240, 260)">
            <rect x="0" y="0" width="34" height="76" rx="6" fill="#020617" stroke="#334155" stroke-width="1.5" />
            <circle id="sigS_Red" cx="17" cy="16" r="8" fill="#334155" />
            <circle id="sigS_Yel" cx="17" cy="38" r="8" fill="#334155" />
            <circle id="sigS_Grn" cx="17" cy="60" r="8" fill="#334155" />
            <text x="17" y="90" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">SOUTH</text>
          </g>

          <!-- EAST SIGNAL (AMBULANCE APPROACH / PREEMPTION LANE) -->
          <g transform="translate(260, 75)">
            <rect x="0" y="0" width="76" height="34" rx="6" fill="#020617" stroke="#38bdf8" stroke-width="1.5" id="eastSignalBox" />
            <circle id="sigE_Red" cx="18" cy="17" r="8" fill="#334155" />
            <circle id="sigE_Yel" cx="38" cy="17" r="8" fill="#334155" />
            <circle id="sigE_Grn" cx="58" cy="17" r="8" fill="#334155" />
            <text x="38" y="-6" fill="#38bdf8" font-size="9" font-weight="800" text-anchor="middle">EAST (AMBULANCE)</text>
          </g>

          <!-- WEST SIGNAL (Conflicting / Exit) -->
          <g transform="translate(25, 250)">
            <rect x="0" y="0" width="76" height="34" rx="6" fill="#020617" stroke="#334155" stroke-width="1.5" />
            <circle id="sigW_Red" cx="18" cy="17" r="8" fill="#334155" />
            <circle id="sigW_Yel" cx="38" cy="17" r="8" fill="#334155" />
            <circle id="sigW_Grn" cx="58" cy="17" r="8" fill="#334155" />
            <text x="38" y="47" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">WEST</text>
          </g>
        </svg>

        <div class="intersection-footer">
          <div class="lane-status" id="conflictingLanesStatus">
            <span class="label">CROSS TRAFFIC:</span>
            <span class="val green" id="crossStatusVal">NORMAL FLOW</span>
          </div>
          <div class="lane-status" id="ambulanceLaneStatus">
            <span class="label">EMERGENCY CORRIDOR:</span>
            <span class="val" id="ambulanceStatusVal">STANDBY</span>
          </div>
        </div>
      </div>
    `;

    // Cache element references
    this.sigN = { red: document.getElementById('sigN_Red'), yel: document.getElementById('sigN_Yel'), grn: document.getElementById('sigN_Grn') };
    this.sigS = { red: document.getElementById('sigS_Red'), yel: document.getElementById('sigS_Yel'), grn: document.getElementById('sigS_Grn') };
    this.sigE = { red: document.getElementById('sigE_Red'), yel: document.getElementById('sigE_Yel'), grn: document.getElementById('sigE_Grn') };
    this.sigW = { red: document.getElementById('sigW_Red'), yel: document.getElementById('sigW_Yel'), grn: document.getElementById('sigW_Grn') };
    this.corridorArrow = document.getElementById('corridorArrow');
    this.modeBadge = document.getElementById('signalModeBadge');
    this.crossStatusVal = document.getElementById('crossStatusVal');
    this.ambulanceStatusVal = document.getElementById('ambulanceStatusVal');
    this.eastBox = document.getElementById('eastSignalBox');
  }

  setBulb(bulb, color) {
    if (color === 'red') {
      bulb.setAttribute('fill', '#ef4444');
      bulb.setAttribute('filter', 'drop-shadow(0 0 6px #ef4444)');
    } else if (color === 'yellow') {
      bulb.setAttribute('fill', '#f59e0b');
      bulb.setAttribute('filter', 'drop-shadow(0 0 6px #f59e0b)');
    } else if (color === 'green') {
      bulb.setAttribute('fill', '#10b981');
      bulb.setAttribute('filter', 'drop-shadow(0 0 8px #10b981)');
    } else {
      bulb.setAttribute('fill', '#334155');
      bulb.removeAttribute('filter');
    }
  }

  setSignalState(head, color) {
    this.setBulb(head.red, color === 'red' ? 'red' : 'off');
    this.setBulb(head.yel, color === 'yellow' ? 'yellow' : 'off');
    this.setBulb(head.grn, color === 'green' ? 'green' : 'off');
  }

  update(preemption, timestamp = 0) {
    if (preemption) {
      this.isPreempting = true;
      
      // Lock Ambulance Lane (EAST) to GREEN
      this.setSignalState(this.sigE, 'green');
      
      // Lock Conflicting Lanes (NORTH, SOUTH, WEST) to RED
      this.setSignalState(this.sigN, 'red');
      this.setSignalState(this.sigS, 'red');
      this.setSignalState(this.sigW, 'red');

      // Visual accents
      this.corridorArrow.setAttribute('opacity', '1');
      this.modeBadge.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>PREEMPTION ACTIVE`;
      this.modeBadge.className = 'signal-mode preempt';
      this.crossStatusVal.textContent = 'ALL LANES LOCKED RED';
      this.crossStatusVal.className = 'val red';
      this.ambulanceStatusVal.textContent = 'PRIORITY GREEN LOCKED';
      this.ambulanceStatusVal.className = 'val green pulse';
      this.eastBox.setAttribute('stroke', '#10b981');
      this.eastBox.setAttribute('stroke-width', '3');

      // Banner trigger
      if (this.banner) {
        this.banner.classList.remove('hidden');
      }
    } else {
      this.isPreempting = false;
      this.corridorArrow.setAttribute('opacity', '0');
      this.modeBadge.textContent = 'NORMAL ADAPTIVE';
      this.modeBadge.className = 'signal-mode';
      this.crossStatusVal.textContent = 'NORMAL FLOW';
      this.crossStatusVal.className = 'val green';
      this.ambulanceStatusVal.textContent = 'STANDBY';
      this.ambulanceStatusVal.className = 'val';
      this.eastBox.setAttribute('stroke', '#38bdf8');
      this.eastBox.setAttribute('stroke-width', '1.5');

      if (this.banner) {
        this.banner.classList.add('hidden');
      }

      // Normal traffic light cycle (simulate 8s cycle)
      const cycleTime = Math.floor(timestamp % 8);
      if (cycleTime < 4) {
        // N/S Green, E/W Red
        this.setSignalState(this.sigN, 'green');
        this.setSignalState(this.sigS, 'green');
        this.setSignalState(this.sigE, 'red');
        this.setSignalState(this.sigW, 'red');
      } else {
        // E/W Green, N/S Red
        this.setSignalState(this.sigN, 'red');
        this.setSignalState(this.sigS, 'red');
        this.setSignalState(this.sigE, 'green');
        this.setSignalState(this.sigW, 'green');
      }
    }
  }
}
