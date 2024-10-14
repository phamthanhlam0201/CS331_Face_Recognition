import React, { useState, useRef, useEffect } from 'react';

const FaceDetectionComponent = () => {
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const videoRef = useRef(null);
  const ws = useRef(null);
  const animationRef = useRef(null);

  const startWebcam = () => {
    // Open a WebSocket connection
    setIsWebcamOn(true);
    ws.current = new WebSocket('ws://127.0.0.1:8000/face-detect');

    // Handle messages received from the server
    ws.current.onmessage = (event) => {
      const base64Data = event.data;
      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + base64Data;

      // Schedule rendering on the next animation frame
      animationRef.current = requestAnimationFrame(() => {
        const canvas = videoRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      });
    };
  };

  const endWebcam = () => {
    const canvas = videoRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsWebcamOn(false);
    if (ws.current) {
      ws.current.send(JSON.stringify({ type: 'stop_webcam' })); // Send stop message to the server
    }
    ws.current.close();
    cancelAnimationFrame(animationRef.current); // Cancel the animation frame
  };

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      cancelAnimationFrame(animationRef.current); // Cancel the animation frame
    };
  }, []);

  return (
    <div className='myapp'>
      <canvas ref={videoRef} width={640} height={480} className='video-pos'/>
      <div>
        {isWebcamOn ? (
          <button onClick={endWebcam}>End</button>
        ) : (
          <button onClick={startWebcam}>Start</button>
        )}
      </div>
    </div>
  );
};

export default FaceDetectionComponent;