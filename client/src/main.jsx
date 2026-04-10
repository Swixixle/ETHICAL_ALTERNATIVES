import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initDisintegration } from './utils/disintegrationEngine.js';
import './styles/globals.css';
import './styles/globalPress.css';

initDisintegration();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
