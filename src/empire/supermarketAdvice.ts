import type {Business} from '../prototype/expansionModel';
import {STORE_LOSS_LABELS, storeLevel, type StoreLossReason} from './supermarket';

export type StoreAdviceAction = 'run' | 'staff' | 'inventory' | 'upgrades';
export type StoreLossAdvice = {
  reason: StoreLossReason | 'unknown';
  count: number;
  title: string;
  cause: string;
  tip: string;
  action: StoreAdviceAction;
  actionLabel: string;
};

const money = (n: number) => n.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2});

export function supermarketPurchasingLimits(b: Business, week: number) {
  const store = b.retail?.store;
  if (!store) return [];
  const overallRemaining = Math.max(0, (b.manager?.budget ?? 0) - (b.manager?.spent ?? 0));
  return (['grocery', 'electronics'] as const).map(key => {
    const limit = store.budgets?.[key] ?? b.manager?.budget ?? 0;
    const spent = store.budgetWeek === week ? store.spent[key] : 0;
    const remaining = store.budgets ? Math.max(0, limit - spent) : overallRemaining;
    return {key, limit, spent, remaining, overallRemaining, allowance: Math.min(remaining, overallRemaining), separate: !!store.budgets};
  });
}

// These explain recorded departures; current settings only change the suggested remedy.
export function supermarketLossAdvice(b: Business): StoreLossAdvice[] {
  if (!b.retail?.store) return [];
  const store = b.retail.store;
  const level = storeLevel(b);
  const fridgeBroken = store.events.some(e => e.kind === 'fridge' && !e.resolved);
  const secondCheckout = level < 3
    ? 'Level 3 adds a second ground-floor checkout; then hire another cashier to use it.'
    : !b.hires?.service
      ? 'Your second ground-floor checkout is built. Hire another cashier to use it.'
      : 'Keep both ground-floor cashiers on duty: check shifts, breaks and floor assignments in Staff.';
  const advice: Record<StoreLossReason, Omit<StoreLossAdvice, 'reason' | 'count' | 'title'>> = {
    cold: {
      cause: 'A refrigerator fault stopped shoppers collecting chilled products.',
      tip: b.hires?.maintenance
        ? `Your maintenance worker repairs faults automatically while trading, if on duty on the ground floor. Keep $60 available per repair. ${fridgeBroken ? 'Check repair progress or use the manual repair in Operations → Store situations.' : 'No fault is open now; check alerts and staff coverage for future faults.'}`
        : fridgeBroken
        ? `Repair it in Operations → Store situations for $60${b.cash < 60 ? ' when this business has enough cash' : ''}. Keep $60 available and check fault alerts promptly to limit lost sales and waste.`
        : 'No refrigeration fault is open now. Keep $60 available and repair future faults promptly in Operations → Store situations. Hire a maintenance worker in Staff for automatic repairs.',
      action: 'run', actionLabel: fridgeBroken ? 'View refrigeration repair' : 'Check store situations',
    },
    crowded: {
      cause: 'The store reached its limit of 18 shoppers still shopping or waiting.',
      tip: fridgeBroken
        ? 'Repair the open refrigerator fault first; it blocks chilled-product shoppers. Keep stock assistants and cashiers on duty so shelves and queues keep moving automatically.'
        : `Keep shelves filled and cashiers on duty; customers collect groceries automatically. ${secondCheckout}`,
      action: 'run', actionLabel: 'Review shoppers & queues',
    },
    closing: {
      cause: 'These shoppers had not finished buying when the trading week ended.',
      tip: 'Before reopening, unpack deliveries, refill shelves and check staff coverage. Customers shop automatically; manual checkout help is optional. Late shoppers may still miss closing.',
      action: 'run', actionLabel: 'Prepare for the next week',
    },
    stock: {
      cause: 'Shoppers could not find available goods to buy, or waited too long for stock.',
      tip: b.manager
        ? `In Inventory, check auto-restock, reorder targets and delivery dates.${store.budgets ? ` Groceries have a separate ${money(store.budgets.grocery)} weekly limit within your ${money(b.manager.budget)} overall budget. Raising only the overall budget does not raise this grocery limit.` : ''} Keep enough cash after bills, and buy fresh food in small batches based on sales.`
        : 'In Inventory, order small top-ups of the products you sell before they run out. A purchasing manager can reorder automatically within your budget; avoid large fresh-food orders.',
      action: 'inventory', actionLabel: 'Review stock & purchasing',
    },
    refill: {
      cause: 'Stock was in the backroom but had not reached the shelf.',
      tip: 'Stock assistants refill shelves automatically. Keep one on duty on the ground floor; add another if refilling keeps falling behind. Help refill lowest shelf is optional. Buying more will not move backroom stock onto shelves.',
      action: 'run', actionLabel: 'Refill shelves',
    },
    receiving: {
      cause: 'Purchased goods were still waiting to be unpacked.',
      tip: `Stock assistants unpack deliveries automatically; keep one on duty. Help receive goods is optional.${level >= 3 ? ' A receiving clerk can unpack deliveries faster.' : ' A receiving clerk becomes available at Level 3.'}`,
      action: 'run', actionLabel: 'Unpack deliveries',
    },
    checkout: {
      cause: 'Shoppers with baskets ran out of patience before checkout.',
      tip: `Cashiers checkout baskets automatically. Check shifts and breaks in Staff; manual checkout help is optional. ${secondCheckout}${b.retail.electronicsUnlocked ? ' Upstairs needs its own electronics adviser on duty.' : ''}`,
      action: 'staff', actionLabel: 'Review checkout staffing',
    },
    adviser: {
      cause: 'No electronics adviser was available to collect the ordered item.',
      tip: b.hires?.electronics
        ? 'An adviser is hired. Check their shift, break, training and floor assignment in Staff; they must cover the electronics floor. You can also Help collect in Operations.'
        : 'Hire an electronics adviser in Staff and keep them available on the electronics floor. Until then, use Help collect and Checkout in Operations for ready shoppers.',
      action: 'staff', actionLabel: 'Review electronics staff',
    },
  };
  const result: StoreLossAdvice[] = (Object.keys(STORE_LOSS_LABELS) as StoreLossReason[]).flatMap(reason => {
    const count = store.losses?.[reason] ?? 0;
    return count > 0 ? [{reason, count, title: STORE_LOSS_LABELS[reason], ...advice[reason]}] : [];
  }).sort((a, c) => c.count - a.count);
  const unknown = Math.max(0, (b.venue?.week.lost ?? 0) - result.reduce((sum, a) => sum + a.count, 0));
  if (unknown) result.push({
    reason: 'unknown', count: unknown, title: 'Earlier departures',
    cause: 'This save did not record why these shoppers left.',
    tip: 'Check current shelf stock, store situations and queues in Operations. New departures will include a reason and a matching prevention tip.',
    action: 'run', actionLabel: 'Review store operations',
  });
  return result;
}
