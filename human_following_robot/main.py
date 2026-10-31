import argparse
import time
import cv2

from config import (
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    CONFIDENCE,
    TARGET_AREA,
    AREA_TOLERANCE,
    MAX_SPEED,
    MIN_SPEED,
    TURN_GAIN,
    LOST_TIMEOUT,
)

from motor import MotorDriver
from vision import Detector, terrain_mask


def draw_status(frame, status, color, left_speed, right_speed):
    """
    Draw a large robot instruction panel on the live camera frame.
    """

    # Dark background panel at the top.
    cv2.rectangle(
        frame,
        (10, 10),
        (frame.shape[1] - 10, 115),
        (30, 30, 30),
        -1
    )

    # Main instruction text.
    cv2.putText(
        frame,
        status,
        (25, 52),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        color,
        2,
        cv2.LINE_AA
    )

    # Motor commands shown underneath.
    motor_text = (
        f"LEFT MOTOR: {left_speed:.2f}   "
        f"RIGHT MOTOR: {right_speed:.2f}"
    )

    cv2.putText(
        frame,
        motor_text,
        (25, 88),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        1,
        cv2.LINE_AA
    )


def main():
    parser = argparse.ArgumentParser(
        description="Autonomous Computer-Vision Human-Following Robot"
    )

    parser.add_argument(
        "--camera",
        type=int,
        default=0,
        help="Camera index. Default: 0"
    )

    parser.add_argument(
        "--proto",
        default="models/deploy.prototxt",
        help="Path to MobileNet-SSD deploy.prototxt"
    )

    parser.add_argument(
        "--weights",
        default="models/mobilenet_iter_73000.caffemodel",
        help="Path to MobileNet-SSD .caffemodel weights"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print motor commands only. Do not control real GPIO motors."
    )

    parser.add_argument(
        "--show",
        action="store_true",
        help="Show live camera window"
    )

    parser.add_argument(
        "--search",
        action="store_true",
        help="Rotate slowly to search when person is not visible"
    )

    parser.add_argument(
        "--terrain",
        action="store_true",
        help="Enable optional K-means terrain segmentation"
    )

    args = parser.parse_args()

    # Start camera.
    camera = cv2.VideoCapture(args.camera)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

    if not camera.isOpened():
        raise RuntimeError(
            f"Cannot open camera {args.camera}. "
            "Try --camera 1 or check camera permissions."
        )

    # Load person detector.
    detector = Detector(
        proto=args.proto,
        weights=args.weights,
        confidence=CONFIDENCE
    )

    # Start motor controller.
    motors = MotorDriver(dry_run=args.dry_run)

    # Store time of the most recent person detection.
    last_seen = time.monotonic()

    # Store last instruction so PowerShell does not print it every frame.
    last_instruction = ""

    print("Robot vision system started.")
    print("Press Q in the video window to stop.")

    try:
        while True:
            success, frame = camera.read()

            if not success:
                print("Camera frame could not be read.")
                break

            now = time.monotonic()

            # Detect the strongest detected person.
            result = detector.detect(frame)

            # Default values.
            left_speed = 0.0
            right_speed = 0.0
            status = "ROBOT: STOP - PERSON NOT VISIBLE"
            status_color = (0, 0, 255)  # Red

            if result is not None:
                confidence, box, area = result
                x1, y1, x2, y2 = box

                # Find person center and image center.
                person_center_x = (x1 + x2) / 2
                image_center_x = frame.shape[1] / 2

                # Negative error: person is left.
                # Positive error: person is right.
                horizontal_error = (
                    person_center_x - image_center_x
                ) / image_center_x

                # Calculate turn correction.
                turn = TURN_GAIN * horizontal_error

                # Draw green person detection box.
                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                detection_text = (
                    f"Person detected: {confidence:.2f}  "
                    f"Distance-area: {area:.3f}"
                )

                cv2.putText(
                    frame,
                    detection_text,
                    (x1, max(140, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA
                )

                # CASE 1:
                # Person is too close.
                if area > TARGET_AREA + AREA_TOLERANCE:
                    left_speed = 0.0
                    right_speed = 0.0

                    status = "ROBOT: STOP - PERSON TOO CLOSE"
                    status_color = (0, 0, 255)  # Red

                    motors.stop()

                # CASE 2:
                # Person is on the left side of camera.
                elif horizontal_error < -0.18:
                    forward_speed = MIN_SPEED

                    left_speed = forward_speed + turn
                    right_speed = forward_speed - turn

                    motors.drive(left_speed, right_speed)

                    status = "ROBOT: TURN LEFT"
                    status_color = (0, 165, 255)  # Orange

                # CASE 3:
                # Person is on the right side of camera.
                elif horizontal_error > 0.18:
                    forward_speed = MIN_SPEED

                    left_speed = forward_speed + turn
                    right_speed = forward_speed - turn

                    motors.drive(left_speed, right_speed)

                    status = "ROBOT: TURN RIGHT"
                    status_color = (0, 165, 255)  # Orange

                # CASE 4:
                # Person is centered but far away.
                elif area < TARGET_AREA - AREA_TOLERANCE:
                    distance_error = (
                        TARGET_AREA - area
                    ) / TARGET_AREA

                    forward_speed = MIN_SPEED + (
                        MAX_SPEED - MIN_SPEED
                    ) * min(1.0, distance_error)

                    left_speed = forward_speed
                    right_speed = forward_speed

                    motors.drive(left_speed, right_speed)

                    status = "ROBOT: MOVE FORWARD"
                    status_color = (0, 255, 0)  # Green

                # CASE 5:
                # Person is centered and at good following distance.
                else:
                    left_speed = 0.0
                    right_speed = 0.0

                    motors.stop()

                    status = "ROBOT: STOP - SAFE FOLLOWING DISTANCE"
                    status_color = (255, 255, 0)  # Cyan

                last_seen = now

            else:
                # CASE 6:
                # Person was not detected.

                time_without_person = now - last_seen

                if args.search and time_without_person > LOST_TIMEOUT:
                    left_speed = 0.18
                    right_speed = -0.18

                    motors.drive(left_speed, right_speed)

                    status = "ROBOT: SEARCHING FOR PERSON"
                    status_color = (0, 165, 255)  # Orange

                else:
                    left_speed = 0.0
                    right_speed = 0.0

                    motors.stop()

                    status = "ROBOT: STOP - PERSON NOT VISIBLE"
                    status_color = (0, 0, 255)  # Red

            # Add instruction panel to camera output.
            draw_status(
                frame,
                status,
                status_color,
                left_speed,
                right_speed
            )

            # Print instruction to PowerShell only when it changes.
            if status != last_instruction:
                print(status)
                last_instruction = status

            # Optional terrain processing.
            if args.terrain:
                terrain_mask(frame)

                cv2.putText(
                    frame,
                    "Terrain segmentation: ON",
                    (20, frame.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (255, 255, 0),
                    2,
                    cv2.LINE_AA
                )

            # Show camera frame.
            if args.show:
                cv2.imshow(
                    "Autonomous Human-Following Robot",
                    frame
                )

                # Press Q to exit safely.
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        print("\nProgram stopped by user.")

    finally:
        # Always stop motors before closing.
        print("Stopping robot safely.")

        motors.stop()
        motors.close()

        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()