import React from 'react';
import { WeekSummary } from '../hooks/useGameLoop';
import { useDialogFocus } from '../ui/dialogFocus';

export function WeekSummaryModal({ summary, onClose }: { summary: WeekSummary; onClose: () => void }) {
  const dialog = useDialogFocus<HTMLElement>(onClose);
  const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  return <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onKeyDown={dialog.onKeyDown}>
    <section ref={dialog.ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="weekly-report-title" className="mc-panel w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 space-y-4">
      <div><p className="text-sm text-stone-600">Service finished · game paused</p><h2 id="weekly-report-title" className="text-2xl font-bold">Week {summary.week} report</h2></div>
      <div className={`rounded-xl p-4 ${summary.profit >= 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
        <p className="text-sm">Profit after this week’s operating costs and depreciation</p>
        <p className="text-3xl font-bold">{money(summary.profit)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt>Revenue (including tips)</dt><dd className="text-right">{money(summary.revenue)}</dd>
        <dt>Food used</dt><dd className="text-right">−{money(summary.foodCost)}</dd>
        <dt>Wages earned</dt><dd className="text-right">−{money(summary.wages)}</dd>
        <dt>Delivery fees</dt><dd className="text-right">−{money(summary.fees)}</dd>
        {!!summary.propertyRent&&<><dt>Property rent</dt><dd className="text-right">−{money(summary.propertyRent)}</dd></>}
        {!!summary.maintenance&&<><dt>Training, repairs & upkeep</dt><dd className="text-right">−{money(summary.maintenance)}</dd></>}
        <dt>Stock spoiled</dt><dd className="text-right">−{money(summary.spoilage)}</dd>
        {!!summary.hiring&&<><dt>Staff recruitment</dt><dd className="text-right">−{money(summary.hiring)}</dd></>}
        {!!summary.depreciation&&<><dt>Depreciation (non-cash)</dt><dd className="text-right">−{money(summary.depreciation)}</dd></>}
        <dt>Guests served / walked out</dt><dd className="text-right">{summary.served} / {summary.lost}</dd>
        <dt>Service rating</dt><dd className="text-right">{summary.served + summary.lost ? `${summary.starRating.toFixed(1)} / 5` : 'No guests yet'}</dd>
        {summary.topDish && <><dt>Most ordered dish</dt><dd className="text-right">{summary.topDish}</dd></>}
      </dl>
      <p className="text-sm rounded-lg border border-blue-200 bg-blue-50 p-3"><strong>Payroll scheduled:</strong> {money(summary.wages)} will leave your cash after Day 3 of Week {summary.payrollDueWeek}. It is already included in this week’s profit.</p>
      <p className="text-sm text-stone-700">{summary.feedback}</p>
      <p className="text-xs text-stone-500">Equipment and recipe purchases are investments. Depreciation reduces profit without spending cash; see Financials for the full statements.</p>
      <button autoFocus onClick={onClose} className="mc-button-green w-full px-4 py-3 font-bold">Plan Week {summary.week + 1}</button>
    </section>
  </div>;
}
