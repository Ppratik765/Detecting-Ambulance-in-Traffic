/**
 * Adaptive Signal Controller (SVG 4-Way Intersection)
 * Models a 4-way intersection with dynamic signal heads (North, South, East, West).
 * In normal mode: executes cyclic phase timing.
 * In preemption mode: instantly forces conflicting lanes to RED and locks the
 * emergency corridor (North approach) to GREEN.
 */

export class TrafficLightController {
  constructor(containerId = 'traffic-light-container') {
    this.container = document.getElementById(containerId);
    this.badge = document.getElementById('signal-state-badge');
    this.preemptionPill = document.getElementById('preemption-status-pill');
    this.preemptionPillText = document.getElementById('preemption-status-text');

    this.isPreemptionActive = false;
    this.manualOverride = false;
    this.cycleDuration = 8.0; // 8 second standard cycle

    this.render();
    this.cacheElements();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <svg class="intersection-svg" viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- LED Glow Filters -->
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Corridor Gradient -->
          <linearGradient id="corridor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
            <stop offset="50%" stop-color="#10b981" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.1" />
          </linearGradient>
        </defs>

        <!-- Intersection Asphalt Base -->
        <rect x="0" y="0" width="500" height="400" fill="#080c14" />
        <!-- Corner Curbs (Grass/Sidewalk) -->
        <rect x="0" y="0" width="180" height="130" fill="#0f172a" rx="12" />
        <rect x="320" y="0" width="180" height="130" fill="#0f172a" rx="12" />
        <rect x="0" y="270" width="180" height="130" fill="#0f172a" rx="12" />
        <rect x="320" y="270" width="180" height="130" fill="#0f172a" rx="12" />

        <!-- Road Surface (Dark Asphalt) -->
        <!-- North-South Road -->
        <rect x="180" y="0" width="140" height="400" fill="#151d2c" />
        <!-- East-West Road -->
        <rect x="0" y="130" width="500" height="140" fill="#151d2c" />

        <!-- Dynamic Emergency Green Corridor Highlight (North -> South) -->
        <rect id="corridor-overlay" x="190" y="0" width="120" height="400" fill="url(#corridor-grad)" opacity="0" />

        <!-- Lane Markings: Double Yellow Center Lines -->
        <!-- North approach center -->
        <line x1="248" y1="0" x2="248" y2="120" stroke="#fbbf24" stroke-width="2" />
        <line x1="252" y1="0" x2="252" y2="120" stroke="#fbbf24" stroke-width="2" />
        <!-- South approach center -->
        <line x1="248" y1="280" x2="248" y2="400" stroke="#fbbf24" stroke-width="2" />
        <line x1="252" y1="280" x2="252" y2="400" stroke="#fbbf24" stroke-width="2" />
        <!-- West approach center -->
        <line x1="0" y1="198" x2="170" y2="198" stroke="#fbbf24" stroke-width="2" />
        <line x1="0" y1="202" x2="170" y2="202" stroke="#fbbf24" stroke-width="2" />
        <!-- East approach center -->
        <line x1="330" y1="198" x2="500" y2="198" stroke="#fbbf24" stroke-width="2" />
        <line x1="330" y1="202" x2="500" y2="202" stroke="#fbbf24" stroke-width="2" />

        <!-- Crosswalk Markings (Zebra Stripes) -->
        <!-- North Crosswalk -->
        <g stroke="#ffffff" stroke-width="4" opacity="0.4" stroke-dasharray="10 8">
          <line x1="185" y1="125" x2="315" y2="125" />
        </g>
        <!-- South Crosswalk -->
        <g stroke="#ffffff" stroke-width="4" opacity="0.4" stroke-dasharray="10 8">
          <line x1="185" y1="275" x2="315" y2="275" />
        </g>
        <!-- West Crosswalk -->
        <g stroke="#ffffff" stroke-width="4" opacity="0.4" stroke-dasharray="10 8">
          <line x1="175" y1="135" x2="175" y2="265" />
        </g>
        <!-- East Crosswalk -->
        <g stroke="#ffffff" stroke-width="4" opacity="0.4" stroke-dasharray="10 8">
          <line x1="325" y1="135" x2="325" y2="265" />
        </g>

        <!-- Lane Direction Arrows -->
        <g fill="#94a3b8" opacity="0.5">
          <!-- North approach (inbound down) -->
          <path d="M 215,70 L 215,85 M 215,85 L 210,80 M 215,85 L 220,80" stroke="#94a3b8" stroke-width="2" fill="none" />
          <!-- South approach (outbound down) -->
          <path d="M 215,320 L 215,335 M 215,335 L 210,330 M 215,335 L 220,330" stroke="#94a3b8" stroke-width="2" fill="none" />
          <!-- West approach (inbound right) -->
          <path d="M 70,230 L 85,230 M 85,230 L 80,225 M 85,230 L 80,235" stroke="#94a3b8" stroke-width="2" fill="none" />
          <!-- East approach (inbound left) -->
          <path d="M 430,170 L 415,170 M 415,170 L 420,165 M 415,170 L 420,175" stroke="#94a3b8" stroke-width="2" fill="none" />
        </g>

        <!-- Approaching Emergency Vehicle Beacon (Animated along North corridor) -->
        <g id="ambulance-beacon-marker" opacity="0">
          <circle id="beacon-glow" cx="215" cy="50" r="16" fill="#00f2fe" opacity="0.3" class="ambulance-beacon-pulse" />
          <circle id="beacon-core" cx="215" cy="50" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
          <text id="beacon-label" x="215" y="42" fill="#ffffff" font-size="9" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">AMB-01</text>
        </g>

        <!-- ================================================================
             4 Traffic Signal Heads (N, S, E, W)
             Each has housing box + 3 round lamps (Red, Yellow, Green)
             ================================================================ -->

        <!-- SIGNAL 1: NORTH APPROACH (Controls Inbound South) -->
        <g id="signal-north" transform="translate(142, 60)">
          <!-- Housing -->
          <rect x="0" y="0" width="26" height="60" rx="4" fill="#020617" stroke="#334155" stroke-width="1.5" />
          <!-- Red -->
          <circle id="sn-red" class="light-bulb light-red inactive" cx="13" cy="12" r="7" />
          <!-- Yellow -->
          <circle id="sn-yellow" class="light-bulb light-yellow inactive" cx="13" cy="30" r="7" />
          <!-- Green -->
          <circle id="sn-green" class="light-bulb light-green active" cx="13" cy="48" r="7" />
          <!-- Label -->
          <text x="13" y="-6" fill="#94a3b8" font-size="8" font-family="'JetBrains Mono', monospace" text-anchor="middle">NORTH [CORRIDOR]</text>
        </g>

        <!-- SIGNAL 2: SOUTH APPROACH -->
        <g id="signal-south" transform="translate(332, 280)">
          <!-- Housing -->
          <rect x="0" y="0" width="26" height="60" rx="4" fill="#020617" stroke="#334155" stroke-width="1.5" />
          <!-- Red -->
          <circle id="ss-red" class="light-bulb light-red inactive" cx="13" cy="12" r="7" />
          <!-- Yellow -->
          <circle id="ss-yellow" class="light-bulb light-yellow inactive" cx="13" cy="30" r="7" />
          <!-- Green -->
          <circle id="ss-green" class="light-bulb light-green active" cx="13" cy="48" r="7" />
          <!-- Label -->
          <text x="13" y="72" fill="#94a3b8" font-size="8" font-family="'JetBrains Mono', monospace" text-anchor="middle">SOUTH [OUTBOUND]</text>
        </g>

        <!-- SIGNAL 3: EAST APPROACH (Conflicting Lane) -->
        <g id="signal-east" transform="translate(340, 75)">
          <!-- Housing (Horizontal) -->
          <rect x="0" y="0" width="60" height="26" rx="4" fill="#020617" stroke="#334155" stroke-width="1.5" />
          <!-- Red -->
          <circle id="se-red" class="light-bulb light-red active" cx="12" cy="13" r="7" />
          <!-- Yellow -->
          <circle id="se-yellow" class="light-bulb light-yellow inactive" cx="30" cy="13" r="7" />
          <!-- Green -->
          <circle id="se-green" class="light-bulb light-green inactive" cx="48" cy="13" r="7" />
          <!-- Label -->
          <text x="30" y="-6" fill="#94a3b8" font-size="8" font-family="'JetBrains Mono', monospace" text-anchor="middle">EAST [CROSS]</text>
        </g>

        <!-- SIGNAL 4: WEST APPROACH (Conflicting Lane) -->
        <g id="signal-west" transform="translate(100, 295)">
          <!-- Housing (Horizontal) -->
          <rect x="0" y="0" width="60" height="26" rx="4" fill="#020617" stroke="#334155" stroke-width="1.5" />
          <!-- Red -->
          <circle id="sw-red" class="light-bulb light-red active" cx="12" cy="13" r="7" />
          <!-- Yellow -->
          <circle id="sw-yellow" class="light-bulb light-yellow inactive" cx="30" cy="13" r="7" />
          <!-- Green -->
          <circle id="sw-green" class="light-bulb light-green inactive" cx="48" cy="13" r="7" />
          <!-- Label -->
          <text x="30" y="38" fill="#94a3b8" font-size="8" font-family="'JetBrains Mono', monospace" text-anchor="middle">WEST [CROSS]</text>
        </g>

        <!-- Route Indicator Box -->
        <g id="corridor-active-indicator" opacity="0">
          <rect x="195" y="180" width="110" height="40" rx="6" fill="#090e17" stroke="#10b981" stroke-width="2" filter="url(#glow-green)" />
          <text x="250" y="198" fill="#10b981" font-size="10" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">CORRIDOR LOCKED</text>
          <text x="250" y="212" fill="#e2e8f0" font-size="8" font-family="'JetBrains Mono', monospace" text-anchor="middle">PREEMPTION ACTIVE</text>
        </g>
      </svg>
    `;
  }

  cacheElements() {
    this.elements = {
      // North Signal
      snRed: document.getElementById('sn-red'),
      snYellow: document.getElementById('sn-yellow'),
      snGreen: document.getElementById('sn-green'),
      // South Signal
      ssRed: document.getElementById('ss-red'),
      ssYellow: document.getElementById('ss-yellow'),
      ssGreen: document.getElementById('ss-green'),
      // East Signal
      seRed: document.getElementById('se-red'),
      seYellow: document.getElementById('se-yellow'),
      seGreen: document.getElementById('se-green'),
      // West Signal
      swRed: document.getElementById('sw-red'),
      swYellow: document.getElementById('sw-yellow'),
      swGreen: document.getElementById('sw-green'),
      // Visual Overlays
      corridorOverlay: document.getElementById('corridor-overlay'),
      beaconMarker: document.getElementById('ambulance-beacon-marker'),
      beaconCore: document.getElementById('beacon-core'),
      beaconGlow: document.getElementById('beacon-glow'),
      corridorIndicator: document.getElementById('corridor-active-indicator')
    };
  }

  /**
   * Helper to set single bulb state
   */
  setLamp(lampEl, state, glowFilter = '') {
    if (!lampEl) return;
    if (state) {
      lampEl.classList.remove('inactive');
      lampEl.classList.add('active');
      if (glowFilter) lampEl.setAttribute('filter', `url(#${glowFilter})`);
    } else {
      lampEl.classList.remove('active');
      lampEl.classList.add('inactive');
      lampEl.removeAttribute('filter');
    }
  }

  /**
   * Update intersection lights based on timestamp and preemption flag
   * @param {number} timestamp - Current video time in seconds
   * @param {boolean} preemptionActive - True when P_fusion >= 0.75
   */
  update(timestamp, preemptionActive) {
    const isPreempted = Boolean(preemptionActive || this.manualOverride);
    this.isPreemptionActive = isPreempted;

    if (isPreempted) {
      // ========================================================
      // EMERGENCY PREEMPTION MODE:
      // North & South: Locked GREEN (Green Corridor)
      // East & West (Cross-traffic): Locked RED
      // ========================================================
      this.setLamp(this.elements.snRed, false);
      this.setLamp(this.elements.snYellow, false);
      this.setLamp(this.elements.snGreen, true, 'glow-green');

      this.setLamp(this.elements.ssRed, false);
      this.setLamp(this.elements.ssYellow, false);
      this.setLamp(this.elements.ssGreen, true, 'glow-green');

      this.setLamp(this.elements.seRed, true, 'glow-red');
      this.setLamp(this.elements.seYellow, false);
      this.setLamp(this.elements.seGreen, false);

      this.setLamp(this.elements.swRed, true, 'glow-red');
      this.setLamp(this.elements.swYellow, false);
      this.setLamp(this.elements.swGreen, false);

      // Highlight green corridor
      if (this.elements.corridorOverlay) this.elements.corridorOverlay.setAttribute('opacity', '0.7');
      if (this.elements.corridorIndicator) this.elements.corridorIndicator.setAttribute('opacity', '1');

      // Animate Ambulance beacon position along North lane (y: 20 to 360)
      if (this.elements.beaconMarker) {
        this.elements.beaconMarker.setAttribute('opacity', '1');
        const prog = Math.min(1.0, Math.max(0, (timestamp - 9.0) / 16.0));
        const beaconY = 30 + prog * 310;
        if (this.elements.beaconCore) this.elements.beaconCore.setAttribute('cy', beaconY);
        if (this.elements.beaconGlow) this.elements.beaconGlow.setAttribute('cy', beaconY);
      }

      // Update HUD status
      if (this.badge) {
        this.badge.textContent = '[PREEMPTION] GREEN CORRIDOR';
        this.badge.className = 'badge badge-preempt';
      }
      if (this.preemptionPill) {
        this.preemptionPill.className = 'status-pill status-active';
      }
      if (this.preemptionPillText) {
        this.preemptionPillText.textContent = '[ACTIVE] GREEN CORRIDOR LOCKED';
      }

    } else {
      // ========================================================
      // NORMAL TRAFFIC LIGHT CYCLING MODE:
      // Standard 8s cycle:
      // 0 - 3.5s: North/South Green, East/West Red
      // 3.5 - 4.5s: North/South Yellow, East/West Red
      // 4.5 - 7.0s: East/West Green, North/South Red
      // 7.0 - 8.0s: East/West Yellow, North/South Red
      // ========================================================
      const cycleTime = (timestamp || 0) % this.cycleDuration;

      let nsRed = false, nsYellow = false, nsGreen = false;
      let ewRed = false, ewYellow = false, ewGreen = false;

      if (cycleTime < 3.5) {
        nsGreen = true;
        ewRed = true;
      } else if (cycleTime < 4.5) {
        nsYellow = true;
        ewRed = true;
      } else if (cycleTime < 7.0) {
        nsRed = true;
        ewGreen = true;
      } else {
        nsRed = true;
        ewYellow = true;
      }

      this.setLamp(this.elements.snRed, nsRed, nsRed ? 'glow-red' : '');
      this.setLamp(this.elements.snYellow, nsYellow, nsYellow ? 'glow-yellow' : '');
      this.setLamp(this.elements.snGreen, nsGreen, nsGreen ? 'glow-green' : '');

      this.setLamp(this.elements.ssRed, nsRed, nsRed ? 'glow-red' : '');
      this.setLamp(this.elements.ssYellow, nsYellow, nsYellow ? 'glow-yellow' : '');
      this.setLamp(this.elements.ssGreen, nsGreen, nsGreen ? 'glow-green' : '');

      this.setLamp(this.elements.seRed, ewRed, ewRed ? 'glow-red' : '');
      this.setLamp(this.elements.seYellow, ewYellow, ewYellow ? 'glow-yellow' : '');
      this.setLamp(this.elements.seGreen, ewGreen, ewGreen ? 'glow-green' : '');

      this.setLamp(this.elements.swRed, ewRed, ewRed ? 'glow-red' : '');
      this.setLamp(this.elements.swYellow, ewYellow, ewYellow ? 'glow-yellow' : '');
      this.setLamp(this.elements.swGreen, ewGreen, ewGreen ? 'glow-green' : '');

      // Deactivate corridor overlay & beacon
      if (this.elements.corridorOverlay) this.elements.corridorOverlay.setAttribute('opacity', '0');
      if (this.elements.corridorIndicator) this.elements.corridorIndicator.setAttribute('opacity', '0');
      if (this.elements.beaconMarker) this.elements.beaconMarker.setAttribute('opacity', '0');

      // Normal cycle HUD
      if (this.badge) {
        this.badge.textContent = 'CYCLING NORMAL';
        this.badge.className = 'badge badge-normal';
      }
      if (this.preemptionPill) {
        this.preemptionPill.className = 'status-pill status-standby';
      }
      if (this.preemptionPillText) {
        this.preemptionPillText.textContent = 'STANDBY: NORMAL CYCLE';
      }
    }
  }

  setManualOverride(forcePreempt) {
    this.manualOverride = forcePreempt;
  }
}
