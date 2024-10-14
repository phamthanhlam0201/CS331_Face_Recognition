from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
# from mtcnn.mtcnn import MTCNN
# from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.applications.inception_resnet_v2 import InceptionResNetV2, preprocess_input
from tensorflow.keras.preprocessing import image
import numpy as np
import json
import time
import os
import base64
import tensorflow as tf
from starlette.websockets import WebSocketState, WebSocketDisconnect
import asyncio

app = FastAPI()

# Cấu hình CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo đối tượng WebSocket
class ConnectionManager:
    def __init__(self):
        self.connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.remove(websocket)

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_message(self, message: str):
        for connection in self.connections:
            if connection.application_state == WebSocketState.CONNECTED:
                await connection.send_text(message)
    async def send_to_all(self, message: str):
        for connection in self.connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Cấu hình mô hình và ngưỡng
inception_resnet_model = InceptionResNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
haar_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

FEATURE_THRESHOLD = 0.7

script_directory = os.path.dirname(os.path.abspath(__file__))

# Đường dẫn đến thư mục lưu ảnh khuôn mặt được phát hiện
detected_faces_folder = os.path.join(script_directory, 'image')
os.makedirs(detected_faces_folder, exist_ok=True)

# Đường dẫn đến tệp JSON lưu dữ liệu khuôn mặt
json_file_path = os.path.join(script_directory, 'faces_data.json')

if not os.path.isfile(json_file_path):
    with open(json_file_path, 'w') as json_file:
        json_file.write('{}')

def extract_features(img):
    img = cv2.resize(img, (224, 224))
    img = image.img_to_array(img)
    img = np.expand_dims(img, axis=0)
    img = preprocess_input(img)
    
    # Replace VGG16 with InceptionResNetV2
    features = inception_resnet_model.predict(img)
    return features.flatten()

def detect_faces(img):
    faces = haar_cascade.detectMultiScale(img, scaleFactor=1.1, minNeighbors=9)
    return faces
        
def checking_id(features, data):
    matching_face_id = None
    similarity = FEATURE_THRESHOLD
    for face_id, face_data in data.items():
        existing_features = np.array(face_data['extract_feature'])
        current_similarity = np.dot(features, existing_features) / (
            np.linalg.norm(features) * np.linalg.norm(existing_features)
        )

        if current_similarity > similarity:
            matching_face_id = face_id
            similarity = current_similarity

    return matching_face_id, similarity

def save_faces_data(data):
    with open(json_file_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)

def draw_bounding_boxes(img, faces, data):
    # id_list = []
    for (x, y, width, height) in faces:
        detected_face = img[y:y+height, x:x+width]
        features = extract_features(detected_face)

        # matching_face_id, simi = checking_id(features, data, id_list)
        matching_face_id, simi = checking_id(features, data)

        if matching_face_id:
            # id_list.append(matching_face_id)
            id=matching_face_id
            name=data[id]['name']

        else:
            name="Unknown"
            simi = 0
        cv2.rectangle(img, (x, y), (x + width, y + height), (0, 255, 0), 2)
        text = f"{name} ({simi:.2f})"
        # Display the name and similarity on the bounding box
        cv2.putText(img, text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    return img

# Định nghĩa endpoint "/ok"
@app.get("/ok")
async def main():
    print('APP')
    return 'APP'

# Định nghĩa endpoint "add-face"
@app.websocket("/add-face")
async def websocket_endpoint_add_face(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_json()
                await process_data(data, websocket)
            except json.JSONDecodeError:
                print("Invalid JSON received from client")

    except WebSocketDisconnect:
        print("WebSocket disconnected. Closing connection.")
    except RuntimeError as e:
        print(f"RuntimeError: {e}")
    finally:
        manager.disconnect(websocket)

# Xử lý dữ liệu nhận được từ client
async def process_data(data_str, websocket: WebSocket):
        # Check if the JSON file exists
        if os.path.isfile(json_file_path):
            with open(json_file_path, 'r') as json_file:
                try:
                    data = json.load(json_file)
                except json.JSONDecodeError:
                    data = {}
        else:
            data = {}

        # Attempt to decode base64 data
        image_data = base64.b64decode(data_str['base64img'])
        img = cv2.imdecode(np.frombuffer(image_data, np.uint8), -1)

        faces = detect_faces(img)

        for (x,y,width,height) in faces:
            detected_face = img[y:y+height, x:x+width]
            features = extract_features(detected_face)

            matching_face_id, _ = checking_id(features, data)

            if not matching_face_id:
                face_id = str(len(data) + 1)
                name = "Unknown"
                data[face_id] = {
                    'id': face_id,
                    'name': name,
                    'extract_feature': features.tolist(),
                    'timestamp': time.time()
                }

                detected_face_filename = f"face_{face_id}.JPEG"
                detected_face_path = os.path.join(detected_faces_folder, detected_face_filename)
                cv2.imwrite(detected_face_path, detected_face)

                with open(detected_face_path, "rb") as image_file:
                    encoded_image_data = base64.b64encode(image_file.read()).decode('utf-8')

                data[face_id]['detected_face'] = encoded_image_data
                data[face_id]['status'] = 'Already exists' if matching_face_id else 'Saved successfully'

        save_faces_data(data)

@app.websocket("/update-data")
async def websocket_endpoint_update_data(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Nhận dữ liệu từ client
            data = await websocket.receive_json()
            
            # Kiểm tra sự kiện từ client và xử lý
            if data.get('event') == 'get-data':
                with open(json_file_path, 'r') as json_file:
                    faces_data = json.load(json_file)
                # Gửi dữ liệu về cho client
                await websocket.send_text(json.dumps({"type": "websocket.send", "FacesData": faces_data}))
                print("Send data to client successful")
            else:
                updated_names = data['idname']
                # Xử lý cập nhật tên và lưu lại vào file JSON
                await update_all_face_names(updated_names, websocket)

            # Thêm các xử lý sự kiện khác nếu cần

    except WebSocketDisconnect:
        print("WebSocket disconnected. Closing connection.")
    except RuntimeError as e:
        print(f"RuntimeError: {e}")
    finally:
        manager.disconnect(websocket)

# Hàm xử lý cập nhật tên và lưu vào file JSON
async def update_all_face_names(updated_names, websocket: WebSocket):
    with open(json_file_path, 'r') as file:
        face_data = json.load(file)
        
    print("Updated Names:", updated_names)
    for update in updated_names:
        face_id = update.get('id')
        new_name = update.get('newName')

        # Update only if the current name is "Unknown"
        if face_data.get(face_id, {}).get('name') == "Unknown":
            # Tìm kiếm khuôn mặt với face_id tương ứng
            for face_key, face_info in face_data.items():
                if face_info.get('id') == face_id:
                    face_data[face_key]['name'] = new_name
                    print(f"Updated Name for Face ID {face_id}: {new_name}")
                    break

    # Lưu dữ liệu mới vào file JSON
    save_faces_data(face_data)

@app.websocket('/face-detect')
async def websocket_face_detect(websocket: WebSocket):
    await manager.connect(websocket)

    # Open the webcam
    with open(json_file_path, 'r') as json_file:
        data = json.load(json_file)

    cap = cv2.VideoCapture(0)

    try:
        while True:  # WebSocket connection is open
            # Read a frame from the webcam
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)

            faces = detect_faces(frame)
            # Draw bounding boxes on the faces
            frame = draw_bounding_boxes(frame, faces, data)

            # Encode the frame to base64
            base64_encoded = base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode('utf-8')

            # Send the frame to the client
            await websocket.send_text(base64_encoded)

            # Non-blocking receive to check for stop messages
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                if message == '{"type":"stop_webcam"}':
                    break  # Break the loop if stop message is received
            except asyncio.TimeoutError:
                pass  # Continue sending frames if no message is received

    except Exception as e:
        print(f"Error in face detection WebSocket: {e}")
    finally:
        # Release the webcam when done
        cap.release()
        manager.disconnect(websocket)