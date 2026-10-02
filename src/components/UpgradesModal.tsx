import React from 'react';
import { GameState, UPGRADE_COSTS, SALARIES, ONLINE_APPS } from '../hooks/useGameLoop';
import { canHire, MANAGER_COST, STAFF_UNLOCKS, STAFF_LIMITS, weeklyWages } from '../gameplay';

interface Props {
  state: GameState;
  onBuyUpgrade: (type: 'table' | 'waiter' | 'chef' | 'cleaner') => void;
  onBuyLevelUpgrade: (type: 'mealPrice' | 'cookingSpeed' | 'spawnRate', level: number) => void;
  onHireManager: () => void;
  onUnlockApp: (id: string) => void;
  onUpdateManager: (changes: Partial<GameState['manager']>) => void;
}

export function UpgradesModal({ state, onBuyUpgrade, onBuyLevelUpgrade, onHireManager, onUnlockApp, onUpdateManager }: Props) {
  const served = state.stats.customersServed;
  return <div className="space-y-5">
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
      <h3 className="font-bold text-lg">Grow your team as your restaurant grows</h3>
      <p className="text-sm mt-1">{state.testingUnlocked ? 'Testing mode: all staff and delivery partners are available to hire or connect.' : 'Your starter chef handles cooking. Serve 6 guests to unlock a waiter, 16 for a cleaner, and 40 for a purchasing manager.'}</p>
      <p className="text-sm mt-2 font-semibold">Current wages: ${weeklyWages(state.staff)} / full week · paid after Day 3 of the following week.</p>
      <p className="text-xs mt-1">Midweek hires earn prorated wages. Hiring fees are paid immediately.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      {(['waiter', 'chef', 'cleaner', 'manager'] as const).map(type => {
        const count = type === 'manager' ? Number(state.staff.hasManager) : state.staff[`${type}s`];
        const cost = type === 'manager' ? MANAGER_COST : UPGRADE_COSTS[type](count);
        const unlocked = state.testingUnlocked || served >= STAFF_UNLOCKS[type];
        const title = { waiter: 'Floor waiter', chef: 'Line chef', cleaner: 'Table cleaner', manager: 'Purchasing manager' }[type];
        const description = {
          waiter: 'Takes orders and serves complete tables. You can still step in when a guest needs help.',
          chef: 'Adds kitchen capacity. Use Prioritize on an order ticket to focus the team on that table.',
          cleaner: 'Clears dirty tables automatically. Keep seats available during the lunch rush.',
          manager: 'Restocks your active menu within the budget and cash reserve you set below.',
        }[type];
        return <Card key={type} title={title} description={description}
          detail={`${count} / ${STAFF_LIMITS[type]} on staff · $${SALARIES[type]} per full week`}
          label={!unlocked ? `Serve ${STAFF_UNLOCKS[type]} guests (${served}/${STAFF_UNLOCKS[type]})` : count >= STAFF_LIMITS[type] ? 'Team complete' : `Hire ${type} · $${cost}`}
          disabled={!canHire(state, type) || state.money < cost}
          onClick={() => type === 'manager' ? onHireManager() : onBuyUpgrade(type)} />;
      })}
    </div>
    {state.staff.hasManager && <section className="rounded-xl border border-stone-300 bg-white p-4 space-y-3">
      <h3 className="font-bold">Purchasing rules</h3>
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={state.manager.enabled} onChange={e => onUpdateManager({ enabled: e.target.checked })} /> Automatic purchasing enabled</label>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Weekly budget<select aria-label="Manager weekly budget" className="block w-full border rounded p-2 mt-1" value={state.manager.budget} onChange={e => onUpdateManager({ budget: Number(e.target.value) })}>{[0,75,150,300,600].map(n => <option key={n} value={n}>${n}</option>)}</select></label>
        <label className="text-sm">Stock target per ingredient<select aria-label="Manager stock target" className="block w-full border rounded p-2 mt-1" value={state.manager.target} onChange={e => onUpdateManager({ target: Number(e.target.value) })}>{[20,30,50].map(n => <option key={n} value={n}>{n} units</option>)}</select></label>
        <label className="text-sm">Keep this much cash<select aria-label="Manager cash reserve" className="block w-full border rounded p-2 mt-1" value={state.manager.reserve} onChange={e => onUpdateManager({ reserve: Number(e.target.value) })}>{[100,150,300,500].map(n => <option key={n} value={n}>${n}</option>)}</select></label>
      </div>
      <p className="text-sm text-stone-600">${state.manager.spent.toFixed(2)} / ${state.manager.budget} spent this week. Reorders below half the target; only active-menu ingredients. Wages are paid separately from this budget.</p>
    </section>}
    <h3 className="font-bold">Capacity and equipment</h3>
    <div className="grid md:grid-cols-3 gap-3">
      <Card title="Another table" description="More seats need enough kitchen and service capacity." detail={`${state.tables.length} / 12 tables`} label={`Add table · $${UPGRADE_COSTS.table(state.tables.length)}`} disabled={state.tables.length >= 12 || state.money < UPGRADE_COSTS.table(state.tables.length)} onClick={() => onBuyUpgrade('table')} />
      {(['cookingSpeed','spawnRate'] as const).map(type => {
        const level = Math.round((state.upgrades[type] - 1) / 0.5);
        const cost = UPGRADE_COSTS[type](level);
        return <Card key={type} title={type === 'cookingSpeed' ? 'Faster kitchen' : 'Local marketing'} description={type === 'cookingSpeed' ? 'Increase cooking capacity by 50% of the base rate.' : 'Attract more guests. Make sure your team can handle them.'} detail={`Level ${level}`} label={`Upgrade · $${cost}`} disabled={state.money < cost} onClick={() => onBuyLevelUpgrade(type, level)} />;
      })}
    </div>
    <h3 className="font-bold">Delivery partners{!state.testingUnlocked && ' · unlock after 24 guests served'}</h3>
    <div className="grid md:grid-cols-3 gap-3">
      {Object.entries(ONLINE_APPS).map(([id, app]) => <Card key={id} title={app.name} description={`Extra kitchen orders without using tables. ${Math.round(app.fee * 100)}% commission on sales.`} detail="Orders share capacity with your dining room." label={state.unlockedApps.includes(id) ? 'Connected' : !state.testingUnlocked && served < 24 ? `Serve 24 guests (${served}/24)` : `Connect · $${app.cost}`} disabled={(!state.testingUnlocked && served < 24) || state.unlockedApps.includes(id) || state.money < app.cost} onClick={() => onUnlockApp(id)} />)}
    </div>
  </div>;
}

function Card({ title, description, detail, label, disabled, onClick }: { title: string; description: string; detail: string; label: string; disabled: boolean; onClick: () => void }) {
  return <div className="rounded-xl border border-stone-300 bg-white p-4 flex flex-col gap-2">
    <h4 className="font-bold">{title}</h4><p className="text-sm text-stone-600 flex-1">{description}</p>
    <p className="text-xs font-semibold text-stone-600">{detail}</p>
    <button disabled={disabled} onClick={onClick} className="mc-button px-3 py-2 text-sm">{label}</button>
  </div>;
}
