import cv2
import numpy as np

class Detector:
    def __init__(self, proto, weights, confidence=0.55):
        self.net = cv2.dnn.readNetFromCaffe(proto, weights)
        self.confidence = confidence

    def detect(self, frame):
        height, width = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(
            cv2.resize(frame, (300, 300)),
            0.007843,
            (300, 300),
            127.5
        )
        self.net.setInput(blob)
        detections = self.net.forward()
        best = None

        for i in range(detections.shape[2]):
            confidence = float(detections[0, 0, i, 2])
            class_id = int(detections[0, 0, i, 1])
            if class_id != 15 or confidence < self.confidence:
                continue
            box = (detections[0, 0, i, 3:7] * np.array([width, height, width, height])).astype(int)
            x1, y1, x2, y2 = box
            area = max(1, (x2 - x1) * (y2 - y1)) / (width * height)
            if best is None or confidence > best[0]:
                best = (confidence, box, area)
        return best

def terrain_mask(frame, clusters=4):
    crop = frame[int(frame.shape[0] * 0.55):]
    pixels = crop.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels, clusters, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    return labels.reshape(crop.shape[:2]), centers
