# 🚨 Audio-Visual Sensor Fusion for Emergency Vehicle Preemption

[![Vite](https://img.shields.io/badge/Frontend-Vite%20%2B%20Vanilla%20JS-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![YOLOv8](https://img.shields.io/badge/Computer%20Vision-YOLOv8%20Nano-00FFFF?logo=ultralytics&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![PyTorch](https://img.shields.io/badge/Acoustic%20AI-PyTorch%20Mel--Spectrogram-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end Intelligent Transportation Systems (ITS) command center that fuses **YOLOv8 computer vision object tracking** with **PyTorch Mel-Spectrogram acoustic siren detection** using **Late Bayesian Sensor Fusion**. The system dynamically overrides traffic signals to establish an autonomous **Emergency Green Corridor** when confidence exceeds the $0.75$ safety threshold.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph VideoFeed["📹 Optical & Acoustic Stream"]
        RAW["Traffic Video Stream (H.264 / AAC)"]
    end

    subgraph ColabML["☁️ Colab T4 ML Pipeline (colab/fusion_pipeline.ipynb)"]
        YOLO["YOLOv8 Nano Vehicle Tracker<br/>(Class, Bounding Box, Proximity)"]
        MEL["PyTorch Mel-Spectrogram CNN<br/>(700-1600Hz Siren Harmonic Detection)"]
        
        P_VIS["P_vision &isin; [0, 1]"]
        P_AUD["P_audio &isin; [0, 1]"]

        FUSION["Late Bayesian Fusion Engine<br/>P_fusion = 1 - (1 - P_vision) &times; (1 - P_audio)"]
        THRESHOLD{"P_fusion &ge; 0.75?"}
        PREEMPT_TRUE["preemption_active = TRUE"]
        PREEMPT_FALSE["preemption_active = FALSE"]
        
        EXPORT["Export Artifacts<br/>telemetry.json + ambulance_feed.mp4"]
    end

    subgraph Frontend["🖥️ Real-Time Command Center (frontend/)"]
        PLAYER["HTML5 Video Player + Time Scrubber"]
        CANVAS["Canvas Overlay: YOLO Bounding Boxes"]
        GAUGES["Circular SVG Gauges: P_vision, P_audio, P_fusion"]
        TRAFFIC["SVG 4-Way Intersection Signal Controller"]
        AUDIO_VIZ["Web Audio API Waveform & Spectrogram"]
        BANNER["🚨 Flashing CSS Strobe Emergency Banner"]
    end

    RAW --> YOLO --> P_VIS --> FUSION
    RAW --> MEL --> P_AUD --> FUSION
    FUSION --> THRESHOLD
    THRESHOLD -- Yes --> PREEMPT_TRUE --> EXPORT
    THRESHOLD -- No --> PREEMPT_FALSE --> EXPORT

    EXPORT -.->|public/data/telemetry.json| Frontend
    RAW -.->|public/videos/ambulance_feed.mp4| Frontend

    PLAYER --> CANVAS
    PLAYER --> GAUGES
    PLAYER --> TRAFFIC
    PLAYER --> AUDIO_VIZ
    PLAYER --> BANNER
```

---

## 📐 Mathematical Formulation: Late Bayesian Fusion

Single-modality emergency preemption creates severe failure risks in real-world urban canyons:
* **Visual Occlusion:** Large trucks or double-decker buses block optical sightlines.
* **Acoustic Noise:** Heavy rain, echoing glass towers, or ambient construction mask sirens.

To solve this, we compute the combined probability of an active emergency event using **Late Bayesian Fusion**:

$$P_{fusion} = 1 - (1 - P_{vision}) \times (1 - P_{audio})$$

Where:
* $P_{vision} \in [0, 1]$: Confidence of emergency vehicle detection via YOLOv8.
* $P_{audio} \in [0, 1]$: Confidence of emergency siren acoustics via Mel-Spectrogram CNN.
* $P_{fusion} \in [0, 1]$: Dual-modality fused confidence.

**Preemption Trigger:**
$$\text{Signal State} = \begin{cases} 
\text{EMERGENCY GREEN CORRIDOR (Locked Green, Cross-lanes Red)}, & \text{if } P_{fusion} \ge 0.75 \\
\text{NORMAL CYCLIC OPERATION}, & \text{otherwise}
\end{cases}$$

---

## 📁 Repository Structure

```text
its-emergency-detection/
├── colab/
│   └── fusion_pipeline.ipynb            # Self-contained Colab T4 GPU ML pipeline
├── frontend/
│   ├── index.html                       # Split-screen Command Center layout
│   ├── package.json                     # Vite configuration & scripts
│   ├── vite.config.js
│   ├── public/
│   │   ├── data/
│   │   │   └── telemetry.json           # Synchronized frame-by-frame ML telemetry
│   │   └── videos/
│   │       └── ambulance_feed.mp4       # Web-compatible H.264 video with siren audio
│   └── src/
│       ├── main.js                      # Core synchronization engine (Video <-> UI)
│       ├── gauges.js                    # SVG circular telemetry gauges
│       ├── trafficLight.js              # SVG 4-way adaptive intersection controller
│       ├── visualizer.js                # Web Audio API waveform & spectrogram
│       ├── detectionOverlay.js          # YOLO bounding box canvas tracker
│       ├── preemptionManager.js         # Strobe alert banner & alarm dispatcher
│       └── style.css                    # Obsidian dark-mode tactical styling
├── LICENSE                              # MIT License
└── README.md
```

---

## 🚀 Step-by-Step Google Colab Workflow

Follow these instructions to run the machine learning pipeline on Google Colab:

### 1. Upload to Google Colab
1. Navigate to [Google Colab](https://colab.research.google.com/).
2. Click **File** &rarr; **Upload notebook**.
3. Select the file [`colab/fusion_pipeline.ipynb`](colab/fusion_pipeline.ipynb) from this repository.
4. Ensure hardware acceleration is set to GPU:
   * Go to **Runtime** &rarr; **Change runtime type** &rarr; Select **T4 GPU** &rarr; Click **Save**.

### 2. Video Sourcing & Ingestion (Step 2 in Colab)
In Step 2 of the notebook, choose your preferred ingestion method:

#### 🔍 Recommended YouTube Search Queries:
If using YouTube, search for any of these queries on YouTube:
* `ambulance sirens intersection dashcam`
* `ambulance emergency response lights and sirens intersection`
* `ambulance crossing red light sirens`
* `ambulance responding through traffic intersection`

**Selection Tips:**
* Filter YouTube results by **Duration (< 4 minutes)** or Shorts.
* Look for clips where an ambulance approaches the camera/intersection and sirens are clearly audible.
* Copy the YouTube link and paste it into the `YOUTUBE_URL` form field in Colab.

#### 📤 Method B: Upload Direct Video File (Most Reliable)
Because YouTube occasionally throttles or bot-blocks Google Colab cloud IP addresses, the notebook includes a direct upload option (`files.upload()`):
1. Download your chosen traffic video to your computer.
2. Select **Upload Video File (Recommended)** in the Colab dropdown.
3. Colab will prompt you to select the file from your computer. The notebook automatically normalizes it to web-compatible H.264 30 FPS 720p.

### 3. Execute the Machine Learning Pipeline
Run all remaining cells (**Runtime** &rarr; **Run all** or `Ctrl + F9`):
1. **Cell 1 (Dependencies):** Installs `ultralytics`, `torchaudio`, `librosa`, `yt-dlp`, and `soundfile`.
2. **Cell 2 (Ingestion):** Ingests and transcodes the video to `ambulance_feed.mp4`.
3. **Cell 3 (Vision):** Loads `yolov8n.pt` and extracts vehicle bounding boxes and optical scores ($P_{vision}$).
4. **Cell 4 (Audio):** Computes 128-band Mel-Spectrograms and analyzes 700Hz - 1600Hz acoustic siren harmonics ($P_{audio}$).
5. **Cell 5 (Fusion):** Computes $P_{fusion} = 1 - (1 - P_{vision})(1 - P_{audio})$ frame-by-frame and evaluates preemption status ($P_{fusion} \ge 0.75$).
6. **Cell 6 (Export):** Packages all inferences into `telemetry.json` and automatically downloads both `telemetry.json` and `ambulance_feed.mp4` to your browser.

### 4. Load Colab Output into the Dashboard
You have two ways to load the Colab artifacts:

* **Option A (In-Browser Direct Loader - Easiest!):**
  1. Open the running dashboard at `http://localhost:5173`.
  2. Click **📂 Load Colab telemetry.json** in the top toolbar and select your downloaded `telemetry.json`.
  3. Click **📹 Load Colab Video** and select your downloaded `ambulance_feed.mp4`.
  4. The dashboard will instantly switch to **🟢 VERIFIED COLAB PIPELINE** mode!

* **Option B (File System Replacement):**
  1. Move your downloaded `telemetry.json` into: `frontend/public/data/telemetry.json`
  2. Move your downloaded `ambulance_feed.mp4` into: `frontend/public/videos/ambulance_feed.mp4`
  3. Refresh the dashboard!

---

## 💻 Local Frontend Dashboard Setup

The frontend is powered by Vite and Vanilla JavaScript for maximum performance and instant sub-millisecond timeline synchronization.

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 🎮 Interactive Features & Hotkeys

* **Spacebar or Play Button:** Toggle video playback.
* **Timeline Slider:** Scrub through the 30-second timeline. Watch the bounding boxes, circular confidence gauges, and 4-way traffic signals update instantly with zero lag.
* **⚡ JUMP TO EVENT Button:** Seeks directly to $t = 9.50\text{s}$ where siren confidence spikes and the Emergency Green Corridor triggers.
* **🚨 FORCE PREEMPTION Button:** Manually override the traffic signal controller to test dispatch protocols.
* **🔇 Audio Mute Button:** Toggle siren sound and connect Web Audio API frequency analyzer.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
