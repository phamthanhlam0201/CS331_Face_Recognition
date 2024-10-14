// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddFace from './AddFace';
import UpdateName from './UpdateName';
import Detection from './FaceDetection';
import NavAndTitle from './NavAndTitle';
import './App.css';

function App() {
  return (
    <Router>
      <div className="container">
        <div className="nav-column">
          <NavAndTitle />
        </div>
        <div className="main-content">
          <div className='h1-style'>
            <h1>Face Detection</h1>
          </div>
          <div className="component-content">
            <Routes>
              <Route path="/add-face" element={<AddFace />} />
              <Route path="/face-detect" element={<Detection />} />
              <Route path="/update-name" element={<UpdateName />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
