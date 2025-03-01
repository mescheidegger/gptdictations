//App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Masthead from './Masthead';
import Dictate from './Dictate';

function App() {
  return (
    <Router>
      <div className="App">
        <Masthead />
        <Routes>
          <Route path="/" element={<Dictate />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
