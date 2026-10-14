import type {Business} from '../prototype/expansionModel';
import {supermarketLossAdvice, type StoreAdviceAction} from './supermarketAdvice';
import './supermarketAdvice.css';

export function SupermarketLossAdvice({b, compact = false, onAction}: {
  b: Business;
  compact?: boolean;
  onAction?: (action: StoreAdviceAction) => void;
}) {
  const advice = supermarketLossAdvice(b);
  if (!advice.length) return null;
  return <section className={`store-loss-advice${compact ? ' store-loss-advice--compact' : ''}`} aria-label="Customer loss prevention">
    <h4>How to reduce lost sales</h4>
    <p className="store-loss-context">Already left this trading week, not people still waiting. Counts reset when the next week starts.</p>
    <ul>{advice.map(item => <li key={item.reason}>
      <strong><span className="store-loss-count">{item.count}</span> {item.title}</strong>
      {!compact && <p className="store-loss-cause">{item.cause}</p>}
      <p>{item.tip}</p>
      {onAction && <button type="button" onClick={() => onAction(item.action)}>{item.actionLabel} <span aria-hidden="true">→</span></button>}
    </li>)}</ul>
  </section>;
}
