import React, { useState, useRef, useEffect } from 'react';
import './UpdateName.css';
import { useNavigate } from 'react-router-dom';

const EditData = () => {
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [error, setError] = useState(null);
    const [pendingChanges, setPendingChanges] = useState({});
    const navigate = useNavigate();
    const ws = useRef(null);

    useEffect(() => {
        // Khởi tạo WebSocket khi thành phần được gắn kết lần đầu tiên
        ws.current = new WebSocket('ws://127.0.0.1:8000/update-data');

        // Sự kiện mở kết nối
        ws.current.addEventListener('open', () => {
            console.log('WebSocket connection opened');
            ws.current.send(JSON.stringify({ event: 'get-data' }));
        });

        // Sự kiện nhận tin nhắn
        ws.current.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'websocket.send' && data.FacesData) {
                const facesArray = Object.values(data.FacesData);
                setDetectedFaces(facesArray);
                console.log('Message received:', facesArray);
            }
        });

        // Trả về một hàm sẽ chạy khi thành phần bị hủy
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleNameChange = (id, newName) => {
        setPendingChanges((prevChanges) => ({
            ...prevChanges,
            [id]: newName,
        }));
    };

    const SaveAllClick = async () => {
        try {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                const facesWithChanges = detectedFaces.filter((face) =>
                    pendingChanges.hasOwnProperty(face.id)
                );

                const updatedNames = facesWithChanges.map((face) => ({
                    id: face.id,
                    newName: pendingChanges[face.id],
                }));

                ws.current.send(JSON.stringify({ idname: updatedNames }));

                console.log('All names saved successfully');
                setPendingChanges({});
                navigate('/');
            } else {
                console.error('WebSocket connection not open.');
                setTimeout(SaveAllClick, 1000);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="detected-faces-container">
            <h2>Faces Detail</h2>
            {error && <p>Error: {error}</p>}
            <table className="faces-table">
                <tbody>
                    {Object.keys(detectedFaces).map((key, index) => (
                        // Renderizar una fila cada dos caras
                        index % 2 === 0 && (
                            <tr key={key}>
                                {/* Celda para la primera cara */}
                                <td>
                                    {detectedFaces[key] && detectedFaces[key].detected_face && (
                                        <div className="face-content">
                                            <div>
                                                <p>
                                                    <strong>Face ID:</strong> {detectedFaces[key].id}
                                                </p>
                                                <p>
                                                    <strong>Name:</strong>
                                                    <input
                                                        type="text"
                                                        placeholder=""
                                                        value={
                                                            pendingChanges[detectedFaces[key].id] !== undefined
                                                                ? pendingChanges[detectedFaces[key].id]
                                                                : detectedFaces[key].name
                                                        }
                                                        onChange={(e) =>
                                                            handleNameChange(
                                                                detectedFaces[key].id,
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </p>
                                                <p>
                                                    <strong>Status:</strong> {detectedFaces[key].status}
                                                </p>
                                                <p>
                                                    <strong>Image:</strong>
                                                </p>
                                            </div>
                                            <img
                                                src={`data:image/jpeg;base64,${detectedFaces[key].detected_face}`}
                                                alt={`Face ${detectedFaces[key].id}`}
                                            />
                                        </div>
                                    )}
                                </td>
                                {/* Celda para la segunda cara (si existe) */}
                                {index + 1 < Object.keys(detectedFaces).length && (
                                    <td>
                                        {detectedFaces[Object.keys(detectedFaces)[index + 1]].detected_face && (
                                            <div className="face-content">
                                                <div>
                                                    <p>
                                                        <strong>Face ID:</strong>{' '}
                                                        {detectedFaces[Object.keys(detectedFaces)[index + 1]].id}
                                                    </p>
                                                    <p>
                                                        <strong>Name:</strong>
                                                        <input
                                                            type="text"
                                                            placeholder=""
                                                            value={
                                                                pendingChanges[
                                                                    detectedFaces[Object.keys(detectedFaces)[index + 1]]
                                                                        .id
                                                                ] !== undefined
                                                                    ? pendingChanges[
                                                                          detectedFaces[Object.keys(detectedFaces)[index + 1]].id
                                                                      ]
                                                                    : detectedFaces[Object.keys(detectedFaces)[index + 1]].name
                                                            }
                                                            onChange={(e) =>
                                                                handleNameChange(
                                                                    detectedFaces[Object.keys(detectedFaces)[index + 1]].id,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </p>
                                                    <p>
                                                        <strong>Status:</strong>{' '}
                                                        {detectedFaces[Object.keys(detectedFaces)[index + 1]].status}
                                                    </p>
                                                    <p>
                                                        <strong>Image:</strong>
                                                    </p>
                                                </div>
                                                <img
                                                    src={`data:image/jpeg;base64,${
                                                        detectedFaces[Object.keys(detectedFaces)[index + 1]].detected_face
                                                    }`}
                                                    alt={`Face ${
                                                        detectedFaces[Object.keys(detectedFaces)[index + 1]].id
                                                    }`}
                                                />
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        )
                    ))}
                </tbody>
            </table>
            <button onClick={SaveAllClick} className="save-container">
                Save All
            </button>
        </div>
    );
};

export default EditData;
