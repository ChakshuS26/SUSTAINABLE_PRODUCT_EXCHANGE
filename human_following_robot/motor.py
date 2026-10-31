try:
    import RPi.GPIO as GPIO
except ImportError:
    GPIO = None

from config import PINS, MAX_SPEED

class MotorDriver:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run or GPIO is None
        self.last = None
        if not self.dry_run:
            GPIO.setmode(GPIO.BCM)
            for pin in PINS.values():
                GPIO.setup(pin, GPIO.OUT)
            self.left_pwm = GPIO.PWM(PINS["left_pwm"], 1000)
            self.right_pwm = GPIO.PWM(PINS["right_pwm"], 1000)
            self.left_pwm.start(0)
            self.right_pwm.start(0)
            GPIO.output(PINS["standby"], 1)

    def _set_motor(self, in1, in2, pwm, speed):
        speed = max(-1.0, min(1.0, speed))
        if self.dry_run:
            return
        GPIO.output(in1, speed >= 0)
        GPIO.output(in2, speed < 0)
        pwm.ChangeDutyCycle(abs(speed) * 100)

    def drive(self, left, right):
        left = max(-MAX_SPEED, min(MAX_SPEED, left))
        right = max(-MAX_SPEED, min(MAX_SPEED, right))
        if self.dry_run and (left, right) != self.last:
            print(f"Motor command: left={left:.2f}, right={right:.2f}")
        self.last = (left, right)
        self._set_motor(PINS["left_in1"], PINS["left_in2"], self.left_pwm if not self.dry_run else None, left)
        self._set_motor(PINS["right_in1"], PINS["right_in2"], self.right_pwm if not self.dry_run else None, right)

    def stop(self):
        self.drive(0, 0)

    def close(self):
        self.stop()
        if not self.dry_run:
            self.left_pwm.stop()
            self.right_pwm.stop()
            GPIO.cleanup()
