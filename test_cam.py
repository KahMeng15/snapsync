import cv2
import time

def test_cameras():
    print("Scanning for cameras...")
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"Camera index {i} SUCCESS! Resolution: {frame.shape}")
            else:
                print(f"Camera index {i} OPENED but FAILED to read frame.")
            cap.release()
        else:
            print(f"Camera index {i} FAILED to open.")

test_cameras()
