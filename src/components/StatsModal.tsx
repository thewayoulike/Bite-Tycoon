import React, { useState } from 'react';
import { Users, DollarSign, TrendingUp, TrendingDown, PieChart, Landmark, FileText, Activity } from 'lucide-react';
import { INITIAL_INVENTORY_VALUE, STARTING_MONEY } from '../gameplay';
import { GameState } from '../hooks/useGameLoop';
import type {businessFinance} from '../empire/empire';

interface StatsModalProps {
  state: GameState;
  account?:ReturnType<typeof businessFinance>;
}

export const StatsModal: React.FC<StatsModalProps> = ({ state,account={openingCash:STARTING_MONEY,initialContribution:STARTING_MONEY+INITIAL_INVENTORY_VALUE,propertyCost:0,loansPayable:0,loansReceivable:0} }) => {
  const [activeSubTab, setActiveSubTab] = useState<'statements' | 'kpis'>('statements');

  const formatMoney = (val: number) => {
    if (val === 0) return "$0";
    if (val < 0) return `-$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const unpaidWages = state.pendingPayroll.reduce((sum, p) => sum + p.amount, 0) + state.weekStats.wages;

  // Accurate asset valuation by summing FIFO batch queue
  const currentInventoryValue = Object.values(state.inventoryBatches || {}).flat().reduce((total, batch) => {
    return total + (batch.qty * batch.costPerUnit);
  }, 0);

  const cogs = INITIAL_INVENTORY_VALUE + state.stats.inventoryCosts - currentInventoryValue - (state.stats.spoilageCosts || 0);
  const inHouseSales = state.stats.totalEarned - (state.stats.totalTips || 0) - (state.stats.onlineEarned || 0) - (state.stats.vipBonus || 0);
  const grossProfit = state.stats.totalEarned - cogs;

  const totalOpex = state.weekStats.wages + state.stats.salaryCosts + state.stats.managerCosts + (state.stats.onlineFees || 0) + (state.stats.spoilageCosts || 0) + (state.stats.rentCosts || 0);
  const netProfit = grossProfit - totalOpex;

  const inventoryChange = currentInventoryValue - INITIAL_INVENTORY_VALUE;
  const netOperatingCash = netProfit - inventoryChange + unpaidWages;

  const equipmentInvestments = state.stats.upgradeCosts + state.stats.recipeCosts + (state.stats.appCosts || 0);
  const totalInvestments = equipmentInvestments + account.propertyCost;
  const propertyAssets=account.propertyCost?Math.max(0,account.propertyCost-INITIAL_INVENTORY_VALUE):0;
  const totalAssets = state.money + currentInventoryValue + equipmentInvestments + propertyAssets + account.loansReceivable;
  const ownersEquity = account.initialContribution + netProfit;

  // Operational KPIs
  const totalCustomers = state.stats.customersServed + state.stats.customersLost;
  const serviceRate = totalCustomers > 0 ? Math.round((state.stats.customersServed / totalCustomers) * 100) : 100;
  const avgTicket = state.stats.customersServed > 0 ? (state.stats.totalEarned / state.stats.customersServed) : 0;
  const tipRate = inHouseSales > 0 ? Math.round(((state.stats.totalTips || 0) / inHouseSales) * 100) : 0;
  const wasteRatio = state.stats.inventoryCosts > 0 ? Math.round(((state.stats.spoilageCosts || 0) / state.stats.inventoryCosts) * 100) : 0;
  const laborRatio = state.stats.totalEarned > 0 ? Math.round(((state.stats.salaryCosts + state.stats.managerCosts) / state.stats.totalEarned) * 100) : 0;

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <Landmark size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Financial Reporting & Performance Intelligence
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Sales, food costs, cash and wages owed
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSubTab('statements')}
            className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'statements' ? 'mc-button-selected' : 'mc-button'
            }`}
          >
            <FileText size={13} />
            <span>Financial Statements</span>
          </button>
          <button
            onClick={() => setActiveSubTab('kpis')}
            className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'kpis' ? 'mc-button-selected' : 'mc-button'
            }`}
          >
            <Activity size={13} />
            <span>Operational KPIs</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="mc-inner-panel p-3 flex flex-col items-center justify-center text-center bg-[#f8fafc]">
          <span className="text-[#555555] font-black uppercase tracking-widest text-[9px] mb-0.5">
            Total Revenue
          </span>
          <span className="text-xl font-black text-[#2e7d32]">
            ${state.stats.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mc-inner-panel p-3 flex flex-col items-center justify-center text-center bg-[#f8fafc]">
          <span className="text-[#555555] font-black uppercase tracking-widest text-[9px] mb-0.5">
            Total Tips
          </span>
          <span className="text-xl font-black text-[#d97706]">
            ${(state.stats.totalTips || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mc-inner-panel p-3 flex flex-col items-center justify-center text-center bg-[#f8fafc]">
          <span className="text-[#555555] font-black uppercase tracking-widest text-[9px] mb-0.5">
            Guests Served
          </span>
          <span className="text-xl font-black text-[#1565c0]">
            {state.stats.customersServed} <span className="text-xs text-[#64748b]">({serviceRate}%)</span>
          </span>
        </div>

        <div className="mc-inner-panel p-3 flex flex-col items-center justify-center text-center bg-[#f8fafc]">
          <span className="text-[#555555] font-black uppercase tracking-widest text-[9px] mb-0.5">
            Guests Lost
          </span>
          <span className="text-xl font-black text-[#c62828]">
            {state.stats.customersLost}
          </span>
        </div>
      </div>

      {activeSubTab === 'statements' ? (
        /* 3 Financial Statements Columns */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
          {/* 1. Profit & Loss */}
          <div className="mc-inner-panel p-3.5 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-[#2b2b2b] mb-2.5 border-b-2 border-[#8b8b8b] pb-1 uppercase tracking-widest flex items-center justify-between">
                <span>Profit & Loss Statement</span>
                <span className={netProfit >= 0 ? "text-[#2e7d32]" : "text-[#c62828]"}>
                  {netProfit >= 0 ? "PROFITABLE" : "DEFICIT"}
                </span>
              </h4>

              <div className="space-y-1.5 text-xs">
                {/* Revenue */}
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Gross Revenues
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>In-House Food Sales</span>
                    <span className="text-[#2e7d32] font-bold">{formatMoney(inHouseSales)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Online App Sales</span>
                    <span className="text-[#2e7d32] font-bold">{formatMoney(state.stats.onlineEarned || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>VIP Pre-Order Premiums</span>
                    <span className="text-[#2e7d32] font-bold">{formatMoney(state.stats.vipBonus || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Collected Waitstaff Tips</span>
                    <span className="text-[#2e7d32] font-bold">{formatMoney(state.stats.totalTips || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Total Net Revenue</span>
                    <span className="text-[#2e7d32]">{formatMoney(state.stats.totalEarned)}</span>
                  </div>
                </div>

                {/* COGS */}
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Cost of Goods Sold (COGS)
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>FIFO Ingredients Consumed</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Gross Margin</span>
                    <span className={grossProfit >= 0 ? "text-[#2e7d32]" : "text-[#c62828]"}>
                      {formatMoney(grossProfit)}
                    </span>
                  </div>
                </div>

                {/* OPEX */}
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Operating Overhead (OPEX)
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Staff wages earned</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-(state.stats.salaryCosts + state.weekStats.wages))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Staff recruitment fees</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-state.stats.managerCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>App Platform Commission</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-(state.stats.onlineFees || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Expired Food Spoilage</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-(state.stats.spoilageCosts || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]"><span>Property rent</span><span className="text-[#c62828] font-bold">{formatMoney(-(state.stats.rentCosts||0))}</span></div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Total Overhead</span>
                    <span className="text-[#c62828]">{formatMoney(-totalOpex)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black border-t-2 border-[#373737] pt-2 mt-3 bg-[#e2e8f0] p-2 rounded">
              <span className="text-[#2b2b2b]">NET OPERATING PROFIT</span>
              <span className={netProfit >= 0 ? "text-[#2e7d32]" : "text-[#c62828]"}>
                {formatMoney(netProfit)}
              </span>
            </div>
          </div>

          {/* 2. Cash Flow Statement */}
          <div className="mc-inner-panel p-3.5 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-[#2b2b2b] mb-2.5 border-b-2 border-[#8b8b8b] pb-1 uppercase tracking-widest flex items-center justify-between">
                <span>Statement of Cash Flows</span>
                <span className="text-[#1565c0]">LIQUIDITY</span>
              </h4>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[#2b2b2b] font-bold">
                  <span>Initial Seed Capital</span>
                  <span className="text-[#2b2b2b]">{formatMoney(account.openingCash)}</span>
                </div>

                {/* Operations */}
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Operating Activities
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Net Operating Profit</span>
                    <span className={netProfit >= 0 ? "text-[#2e7d32] font-bold" : "text-[#c62828] font-bold"}>
                      {formatMoney(netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Inventory Working Capital Delta</span>
                    <span className={-inventoryChange >= 0 ? "text-[#2e7d32] font-bold" : "text-[#c62828] font-bold"}>
                      {formatMoney(-inventoryChange)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Net Operating Cash (adjusted for unpaid wages)</span>
                    <span className={netOperatingCash >= 0 ? "text-[#2e7d32]" : "text-[#c62828]"}>
                      {formatMoney(netOperatingCash)}
                    </span>
                  </div>
                </div>

                {/* Investing */}
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Investing Activities (CapEx)
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Dining Tables & Kitchen Equipment</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-state.stats.upgradeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>R&D & Recipe Unlocks</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-state.stats.recipeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Delivery App Subscriptions</span>
                    <span className="text-[#c62828] font-bold">{formatMoney(-(state.stats.appCosts || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Net Cash Flow From Investing</span>
                    <span className="text-[#c62828]">{formatMoney(-totalInvestments)}</span>
                  </div>
                </div>
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1 text-[#2b2b2b]">
                  <div className="flex justify-between"><span>Property purchase / setup paid</span><strong>{formatMoney(-account.propertyCost)}</strong></div>
                  <div className="flex justify-between"><span>Business loans received, net of repayments</span><strong>{formatMoney(account.loansPayable)}</strong></div>
                  <div className="flex justify-between"><span>Business loans issued, net of repayments</span><strong>{formatMoney(-account.loansReceivable)}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black border-t-2 border-[#373737] pt-2 mt-3 bg-[#e2e8f0] p-2 rounded">
              <span className="text-[#2b2b2b]">CLOSING CASH TREASURY</span>
              <span className="text-[#1565c0]">
                {formatMoney(state.money)}
              </span>
            </div>
          </div>

          {/* 3. Balance Sheet */}
          <div className="mc-inner-panel p-3.5 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-[#2b2b2b] mb-2.5 border-b-2 border-[#8b8b8b] pb-1 uppercase tracking-widest flex items-center justify-between">
                <span>This Business Balance Sheet</span>
                <span className="text-[#2e7d32]">BALANCED</span>
              </h4>

              <div className="space-y-1.5 text-xs">
                {/* Assets */}
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    This Business Assets
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Cash on Hand</span>
                    <span className="text-[#1565c0] font-bold">{formatMoney(state.money)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>FIFO Pantry Stock (Asset Value)</span>
                    <span className="text-[#2e7d32] font-bold">{formatMoney(currentInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Equipment, Tables & Fixtures</span>
                    <span className="text-[#2b2b2b] font-bold">{formatMoney(state.stats.upgradeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Intellectual Property (Recipes/Apps)</span>
                    <span className="text-[#2b2b2b] font-bold">{formatMoney(state.stats.recipeCosts + (state.stats.appCosts || 0))}</span>
                  </div>
                  <div className="flex justify-between text-[#2b2b2b]"><span>Property / opening setup assets</span><strong>{formatMoney(propertyAssets)}</strong></div>
                  <div className="flex justify-between text-[#2b2b2b]"><span>Loans receivable from other businesses</span><strong>{formatMoney(account.loansReceivable)}</strong></div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Total Valuation Assets</span>
                    <span className="text-[#2e7d32]">{formatMoney(totalAssets)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div className="border-t border-[#8b8b8b] pt-1.5 space-y-1">
                  <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider">
                    Liabilities & Shareholder Equity
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Unpaid wages (including this week)</span>
                    <span className="text-[#2b2b2b] font-bold">{formatMoney(unpaidWages)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Initial Contributed Capital</span>
                    <span className="text-[#2b2b2b] font-bold">{formatMoney(account.initialContribution)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#2b2b2b]">
                    <span>Cumulative Retained Earnings</span>
                    <span className={netProfit >= 0 ? "text-[#2e7d32] font-bold" : "text-[#c62828] font-bold"}>
                      {formatMoney(netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-[#8b8b8b] pt-1 text-[#2b2b2b]">
                    <span>Total Owner's Book Equity</span>
                    <span className="text-[#2b2b2b]">{formatMoney(ownersEquity)}</span>
                  </div>
                  <div className="flex justify-between text-[#2b2b2b]"><span>Loans payable to other businesses</span><strong>{formatMoney(account.loansPayable)}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black border-t-2 border-[#373737] pt-2 mt-3 bg-[#e2e8f0] p-2 rounded">
              <span className="text-[#2b2b2b]">TOTAL LIAB. & EQUITY</span>
              <span className="text-[#2b2b2b]">
                {formatMoney(ownersEquity + unpaidWages + account.loansPayable)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Operational KPIs Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
          {/* KPI 1: Average Guest Ticket */}
          <div className="mc-inner-panel p-4 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2b2b2b]">
                  Average Guest Check (AOV)
                </span>
                <span className="mc-slot px-2 py-0.5 text-[9px] font-black bg-[#2e7d32] text-white">
                  ${avgTicket.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mb-3">
                Calculates mean revenue per guest served, including premium VIP orders and tips.
              </p>
              <div className="w-full bg-[#cbd5e1] h-3 rounded overflow-hidden">
                <div
                  className="bg-[#2e7d32] h-full"
                  style={{ width: `${Math.min(100, (avgTicket / 50) * 100)}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] font-bold text-[#555555] uppercase mt-3">
              Benchmark: $25.00+ for profitable fine dining.
            </div>
          </div>

          {/* KPI 2: Tip Conversion & Customer Satisfaction */}
          <div className="mc-inner-panel p-4 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2b2b2b]">
                  Gratuity & Tip Yield
                </span>
                <span className="mc-slot px-2 py-0.5 text-[9px] font-black bg-[#d97706] text-white">
                  {tipRate}% Yield
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mb-3">
                Reflects customer satisfaction with waiter promptness and chef cooking speed.
              </p>
              <div className="w-full bg-[#cbd5e1] h-3 rounded overflow-hidden">
                <div
                  className="bg-[#d97706] h-full"
                  style={{ width: `${Math.min(100, tipRate * 5)}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] font-bold text-[#555555] uppercase mt-3">
              Tip rate scales higher when tables are served with high patience remaining.
            </div>
          </div>

          {/* KPI 3: Food Waste & Spoilage Ratio */}
          <div className="mc-inner-panel p-4 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2b2b2b]">
                  Pantry Spoilage & Waste Ratio
                </span>
                <span className={`mc-slot px-2 py-0.5 text-[9px] font-black ${wasteRatio > 15 ? 'bg-red-600' : 'bg-emerald-700'} text-white`}>
                  {wasteRatio}% Waste
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mb-3">
                Measures percent of purchased ingredients lost to weekly spoilage.
              </p>
              <div className="w-full bg-[#cbd5e1] h-3 rounded overflow-hidden">
                <div
                  className={`h-full ${wasteRatio > 15 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, wasteRatio * 4)}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] font-bold text-[#555555] uppercase mt-3">
              Keep under 10% by purchasing in conservative bulk amounts.
            </div>
          </div>

          {/* KPI 4: Labor Efficiency Ratio */}
          <div className="mc-inner-panel p-4 bg-[#f8fafc] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2b2b2b]">
                  Staff Payroll / Sales Ratio
                </span>
                <span className="mc-slot px-2 py-0.5 text-[9px] font-black bg-[#1565c0] text-white">
                  {laborRatio}% Labor
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold uppercase mb-3">
                Total chef, waiter, cleaner, and manager wages expressed as a percentage of sales.
              </p>
              <div className="w-full bg-[#cbd5e1] h-3 rounded overflow-hidden">
                <div
                  className="bg-[#1565c0] h-full"
                  style={{ width: `${Math.min(100, laborRatio * 2)}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] font-bold text-[#555555] uppercase mt-3">
              Industry standard aims for 25% - 35% labor overhead.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
