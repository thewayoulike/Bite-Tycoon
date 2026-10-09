import {INITIAL_STATE} from './hooks/useGameLoop';
import {createEmpire,createFastTrackEmpire,unlockTestDistrict} from './empire/empire';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { configureTextBuilder } from 'troika-three-text';

// Keep world labels available offline; the bundled font is CC0.
configureTextBuilder({ defaultFontURL: '/fonts/kenpixel.ttf' });

const requestedMode=new URLSearchParams(location.search).get('mode');
const mode=requestedMode==='career'||requestedMode==='sandbox'?requestedMode:null;
const starter=createEmpire(structuredClone(INITIAL_STATE));
const opening=mode==='sandbox'?unlockTestDistrict(starter,INITIAL_STATE):createFastTrackEmpire(structuredClone(INITIAL_STATE));
const preview=new URLSearchParams(location.search).get('preview')==='fast-track';
const fastTrack=requestedMode==='fast-track';
opening.settings={mode:mode??'career',weekMinutes:3,guide:true};
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App prototype={preview} gameOptions={{...(mode?{saveKey:`bite-tycoon-${mode}-v1`}:fastTrack?{saveKey:'bite-tycoon-fast-track-v1'}:{}),startingEmpire:opening,persist:!preview}}/>
  </StrictMode>,
);
