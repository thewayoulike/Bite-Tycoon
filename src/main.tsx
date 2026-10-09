import {newGame} from './empire/newGame';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { configureTextBuilder } from 'troika-three-text';

// Keep world labels available offline; the bundled font is CC0.
configureTextBuilder({ defaultFontURL: '/fonts/kenpixel.ttf' });

const requestedMode=new URLSearchParams(location.search).get('mode');
const mode=requestedMode==='career'||requestedMode==='sandbox'?requestedMode:null;
const opening=newGame(mode);
const preview=new URLSearchParams(location.search).get('preview')==='fast-track';
const fastTrack=requestedMode==='fast-track';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App prototype={preview} gameOptions={{...(mode?{saveKey:`bite-tycoon-${mode}-v1`}:fastTrack?{saveKey:'bite-tycoon-fast-track-v1'}:{}),startingEmpire:opening,persist:!preview}}/>
  </StrictMode>,
);
