import React, { useRef, useState, useEffect } from 'react';
import "./AddFace.css"
import { useNavigate } from 'react-router-dom';

const Addface = () => {
    const videoRef = useRef(null);
    const ws = useRef(null);
    const intervalRef = useRef(null);
    const [isWebcamOn, setIsWebcamOn] = useState(false);
    const navigate =useNavigate();

    // Hàm lật ngang video theo chiều ngang
    const flipHorizontal = () => {
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.style.transform = 'scaleX(-1)';
        }
    };

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                flipHorizontal();
            }

            // Set up WebSocket
            ws.current = new WebSocket('ws://127.0.0.1:8000/add-face');
            setIsWebcamOn(true);

            // Send frames to the server at a desired rate (e.g., every 1000ms)
            intervalRef.current = setInterval(sendFrames, 500);
        } catch (error) {
        console.error('Error accessing webcam:', error);
        }
    };

    const sendFrames = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg');
        const message = {
            base64img: base64Data.split(',')[1], // Extracting base64 image data
        };

        ws.current.send(JSON.stringify(message));
        console.log(message)
        }
    };

    const endWebcam = () => {
        setIsWebcamOn(false);

        // Clear the interval
        clearInterval(intervalRef.current);

        if (ws.current) {
        ws.current.close();
        }

        // Stop the webcam
        const tracks = videoRef.current.srcObject?.getTracks();
        if (tracks) {
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
        }
        else{navigate('./')}
    };

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
        if (ws.current) {
            ws.current.close();
        }
        clearInterval(intervalRef.current);
        };
    }, []);

  return (
    <div className='myapp'>
      <video ref={videoRef} autoPlay playsInline className='video-pos' width={640} height={480}/>
      {isWebcamOn ? (
        <button onClick={endWebcam}>End</button>
      ) : (
        <button onClick={startWebcam}>Start</button>
      )}
    </div>
  );
};

export default Addface;
