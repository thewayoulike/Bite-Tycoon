import {useRef, useState, type ReactNode} from 'react';
import {ArrowRight, Building2, Store, Star, FolderOpen, FlaskConical, Play, Settings, X, Clock, BriefcaseBusiness} from 'lucide-react';
import './startScreen.css';
import {WEEK_LENGTHS,type WeekMinutes} from '../career/settings';

type Props = {
  firstAcquisition: boolean;
  needsOpeningType: boolean;
  week: number;
  businesses: number;
  cash: number;
  sandbox: boolean;
  muted: boolean;
  weekMinutes: WeekMinutes;
  canChangeWeekLength: boolean;
  onPlay: () => void;
  onNewCareer: () => void;
  onToggleMute: () => void;
  onWeekLengthChange: (minutes: WeekMinutes) => void;
  children?: ReactNode;
  sandboxHref?:string;
  savedGamesHref?:string;
  newCareerMessage?:string;
};

export function StartScreen({firstAcquisition, needsOpeningType, week, businesses, cash, sandbox, muted, weekMinutes, canChangeWeekLength, onPlay, onNewCareer, onToggleMute, onWeekLengthChange, children, sandboxHref='/?mode=sandbox', savedGamesHref='/save-slots.html', newCareerMessage}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [panel, setPanel] = useState<'settings' | 'new' | 'type'>('settings');
  const [error, setError] = useState('');
  const openPanel = (next: typeof panel) => {
    previousFocus.current = document.activeElement as HTMLElement;
    setPanel(next);
    setError('');
    dialog.current?.showModal();
  };
  const closePanel = () => dialog.current?.close();
  const play = () => needsOpeningType ? openPanel('type') : onPlay();
  const money = cash.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

  return <main className="sim-start">
    <div className="sim-start-art" aria-hidden="true"/>
    <header className="sim-start-header">
      <span className="sim-neighborhood"><Store size={18}/> YOUR NEIGHBORHOOD. YOUR EMPIRE.</span>
      <button className="sim-settings" onClick={() => openPanel('settings')}><Settings size={16}/> Settings</button>
    </header>

    <section className="sim-hero" aria-label="Business Simulator main menu">
      <div className="sim-identity">
        <div className="sim-crown"><Star size={18}/> THE CITY IS YOURS <Star size={18}/></div>
        <h1 className="sim-title"><strong>BUSINESS</strong><span>SIMULATOR</span></h1>
        <p className="sim-ribbon">BIG DREAMS START ON A LITTLE STREET</p>
      </div>

      <div className="sim-play-card">
        <span className="sim-card-badge">{firstAcquisition ? 'READY, BOSS?' : sandbox ? 'YOUR SANDBOX AWAITS' : 'WELCOME BACK, BOSS'}</span>
        <button className="sim-play" onClick={play}>
          <Play className="sim-play-icon" fill="currentColor"/>
          <span><strong>{firstAcquisition ? 'LET’S GET STARTED' : needsOpeningType ? 'OPEN FOR BUSINESS' : 'CONTINUE GAME'}</strong>
            <small>{firstAcquisition ? 'Choose your first property' : needsOpeningType ? 'Choose your restaurant type' : sandbox ? 'Return to your sandbox' : 'Continue your career'}</small></span>
          <ArrowRight size={20}/>
        </button>
        <div className="sim-save-stats" aria-label="Current game progress">
          {firstAcquisition ? <><Building2 size={13}/><span>{money} TO START</span><i>·</i><span>LEVEL 1</span></> : <><Clock size={13}/><span>WEEK {week}</span><i>·</i><span>{businesses} {businesses === 1 ? 'BUSINESS' : 'BUSINESSES'}</span><i>·</i><span>{sandbox ? 'SANDBOX' : 'CAREER'}</span></>}
        </div>
        <nav className="sim-modes" aria-label="Ways to play">
          <button onClick={() => openPanel('new')}><BriefcaseBusiness size={17}/> NEW CAREER</button>
          <a href={sandboxHref}><FlaskConical size={18}/> SANDBOX</a>
        </nav>
        <a className="sim-saves" href={savedGamesHref}><FolderOpen size={15}/> Saved games</a>
        <small className="sim-save-note">Progress saves automatically in this browser.</small>
      </div>
    </section>

    <footer className="sim-start-footer"><span>BUILD · MANAGE · GROW</span><span>BUSINESS SIMULATOR</span></footer>

    <dialog className="sim-dialog" ref={dialog} aria-labelledby="sim-dialog-title" onClose={() => previousFocus.current?.focus()}>
      <button className="sim-dialog-close" onClick={closePanel} aria-label="Close dialog"><X size={20}/></button>
      {panel === 'settings' && <>
        <span className="sim-dialog-kicker">GAME SETTINGS</span>
        <h2 id="sim-dialog-title">Make yourself comfortable.</h2>
        <label className="sim-setting"><span>Sound effects<small>Order bells, arrivals and cash-register sounds.</small></span><input type="checkbox" checked={!muted} onChange={onToggleMute}/></label>
        <label className="sim-setting"><span>Week length<small>At 1× speed. Longer weeks allow more trading; staff keep their pace.</small></span><select value={weekMinutes} disabled={!canChangeWeekLength} onChange={e => onWeekLengthChange(Number(e.target.value) as WeekMinutes)}>{WEEK_LENGTHS.map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
        {!canChangeWeekLength && <p className="sim-dialog-note">Finish the current trading week to change its length.</p>}
        <button className="sim-dialog-primary" onClick={closePanel}>Done</button>
      </>}
      {panel === 'new' && <>
        <span className="sim-dialog-kicker">A FRESH START</span>
        <h2 id="sim-dialog-title">Start a new career?</h2>
        <p>Begin at Level 1 with <strong>$250,000</strong>. Lease an empty shop, buy a running business, or buy land and build.</p>
        <div className="sim-career-info"><Building2 size={25}/><p>{newCareerMessage??'Your current Career slot will be replaced. Its previous progress will be kept as a backup in Saved games. Sandbox and older save slots stay separate.'}</p></div>
        {error && <p role="alert" className="sim-dialog-error">{error}</p>}
        <button className="sim-dialog-primary" onClick={() => {try {onNewCareer();} catch {setError('The new career could not be saved. Your previous progress has been kept. Please check browser storage and try again.');}}}><Play size={17} fill="currentColor"/> Start new career</button>
        <button className="sim-dialog-cancel" onClick={closePanel}>Keep playing my current game</button>
      </>}
      {panel === 'type' && <>
        <span className="sim-dialog-kicker">MAKE IT YOURS</span>
        <h2 id="sim-dialog-title">What’s on the menu?</h2>
        <p>Choose the restaurant you want to run. Its opening recipes and ingredients match your choice.</p>
        <div className="sim-type-picker">{children}</div>
        <button className="sim-dialog-primary" onClick={() => {closePanel(); onPlay();}}><Play size={17} fill="currentColor"/> Open restaurant</button>
      </>}
    </dialog>
  </main>;
}
