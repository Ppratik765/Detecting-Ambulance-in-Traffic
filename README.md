# Audio-Visual Sensor Fusion for Emergency Preemption

An intelligent transportation system (ITS) dashboard and deep learning pipeline designed to detect emergency vehicles in traffic using Late Bayesian Sensor Fusion. Combines visual object detection (YOLOv8) with acoustic siren detection (PyTorch 2D CNN on Mel-Spectrograms) to trigger adaptive traffic signal preemption.

---

## Repository Architecture

```text
its-emergency-fusion/
├── colab/
│   └── fusion_pipeline.ipynb            # Full Training & Inference ML pipeline
├── frontend/
│   ├── index.html                       # Split-screen Command Center UI
│   ├── package.json                     # Vite dependencies
│   ├── vite.config.js
│   ├── public/
│   │   ├── data/
│   │   │   └── telemetry.json           # Exported from Colab
│   │   └── videos/
│   │       └── ambulance_feed.mp4       # Processed test video
│   └── src/
│       ├── main.js                      # Sync engine (Video -> UI)
│       ├── visualizer.js                # Canvas audio waveform/spectrogram
│       ├── trafficLight.js              # SVG Adaptive Signal Controller
│       └── style.css                    # Dark-mode styling
└── README.md
```

---

## 1. Colab Backend Pipeline (`colab/fusion_pipeline.ipynb`)

Designed for Google Colab with a **T4 GPU**. Uses `ultralytics`, `torchaudio`, `librosa`, and `moviepy`.

### Automated Datasets Handled:
1. **Visual Dataset:** `abhisheksinghblr/emergency-vehicles-identification`
   - Automated structuring into YOLO format.
   - Fine-tunes `yolov8n.pt` for 10 epochs with early stopping (`patience=5`) to output $P_{vision}$, mAP50, and high F1-score bounding boxes.
2. **Acoustic Dataset:** `vishnu-u/Siren-Sound-Dataset`
   - Loads WAV files, extracts 64-band log Mel-Spectrograms at 16 kHz.
   - Trains a 5-layer Deep 2D CNN (16 -> 32 -> 64 -> 128 -> 128 channels) with BatchNorm, Dropout (0.25-0.3), and learning rate scheduling to classify siren sounds vs. ambient/traffic noise ($P_{audio}$) with high F1-score.
3. **Test Video:** `musawerhussain/ambu-test`
   - Locates `3759222-hd_1920_1080_30fps.mp4`.
   - Uses FFmpeg stream copy to overlay sample siren audio onto the video, producing `ambulance_feed.mp4`.

### Multimodal Late Bayesian Fusion:
$$P_{fusion} = 1 - (1 - P_{vision}) \times (1 - P_{audio})$$

- **Preemption Trigger:** If $P_{fusion} \ge 0.75$, `preemption` is set to `true`.
- **Exported Telemetry:** Structured exactly as:
  ```json
  {
    "meta": { "fps": 30 },
    "frames": [
      {
        "frame": 1,
        "timestamp": 0.03,
        "p_vision": 0.1,
        "p_audio": 0.9,
        "p_fusion": 0.91,
        "preemption": true,
        "bbox": [10, 20, 100, 200]
      }
    ]
  }
  ```

### Running on Google Colab:
1. Open [colab/fusion_pipeline.ipynb](colab/fusion_pipeline.ipynb) in Google Colab.
2. Ensure the runtime type is set to **GPU (T4)**.
3. Run Section 2. Upload your `kaggle.json` API key when prompted.
4. Run all cells sequentially.
5. The final cell will automatically download `telemetry.json` and `ambulance_feed.mp4`.
6. Place `telemetry.json` into `frontend/public/data/` and `ambulance_feed.mp4` into `frontend/public/videos/`.

---

## 2. Frontend Command Center (`frontend/`)

Built with Vanilla JavaScript, HTML5 Canvas, SVG, and Vite.

### Features:
- **Left Pane (55%):** Camera feed playing `ambulance_feed.mp4` with a real-time `<canvas>` overlay rendering YOLOv8 bounding boxes with emergency labels.
- **Right Pane (45%):** Command Center with a dark slate (`#0f172a`) aesthetic.
- **Confidence Gauges:** Three circular SVG gauges for Vision ($P_{vision}$), Audio ($P_{audio}$), and Bayesian Late Fusion ($P_{fusion}$).
- **Adaptive 4-Way Intersection:** SVG controller simulating North, South, East (ambulance corridor), and West signals.
  - When `preemption === true`: Conflicting lanes instantly switch to RED, the ambulance approach locks to GREEN, and a `🚨 EMERGENCY GREEN CORRIDOR TRIGGERED 🚨` banner illuminates.
- **Web Audio API Visualizer:** Live frequency and waveform visualizer connected directly to the `<video>` element's audio stream.
- **Scrub Synchronization:** Timeline scrubbing immediately synchronizes bounding boxes, gauges, and traffic lights with 0 ms lag.

### Running Locally:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.
