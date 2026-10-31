# Autonomous Computer Vision Based Human-Following Robot

## Setup
1. Install Python packages: `pip install -r requirements.txt`
2. Put MobileNet-SSD model files in `models/`: `deploy.prototxt` and `mobilenet_iter_73000.caffemodel`.
3. Safely test camera and AI without motors: `python3 main.py --camera 0 --show --dry-run`
4. Test motors with wheels lifted, then run: `python3 main.py --camera 0 --show`

## Options
- `--search`: rotate slowly after target loss.
- `--terrain`: run the K-means terrain segmentation prototype.
- `--dry-run`: print motor commands without GPIO control.

## Wiring (BCM)
Left: IN1=5, IN2=6, PWM=12. Right: IN1=23, IN2=24, PWM=13. Standby=25. Change pins in `config.py` to match your driver.

## Safety
Never power DC motors from Pi GPIO. Use a motor driver, common ground, regulated logic power, current-appropriate battery, and emergency stop.
