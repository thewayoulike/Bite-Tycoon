import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { configureTextBuilder } from 'troika-three-text';

// Keep world labels available offline; the bundled font is CC0.
configureTextBuilder({ defaultFontURL: '/fonts/kenpixel.ttf' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
