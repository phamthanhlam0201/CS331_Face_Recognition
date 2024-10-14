// NavAndTitle.js
import React from 'react';
import { Link } from 'react-router-dom';

function NavAndTitle() {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/add-face">Add Face</Link>
        </li>
        <li>
          <Link to="/face-detect">Face Detect</Link>
        </li>
        <li>
          <Link to="/update-name">Update Name</Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavAndTitle;
