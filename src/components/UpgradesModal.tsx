import React from 'react';
import { ArrowUpCircle, Coffee, Users, ChefHat, Eraser, Utensils, Clock, Smartphone, UserCheck, Check } from 'lucide-react';
import { GameState, UPGRADE_COSTS, SALARIES, ONLINE_APPS } from '../hooks/useGameLoop';

interface UpgradesModalProps {
  state: GameState;
  onBuyUpgrade: (type: 'table' | 'waiter' | 'chef' | 'cleaner') => void;
  onBuyLevelUpgrade: (type: 'mealPrice' | 'cookingSpeed' | 'spawnRate', currentLevel: number) => void;
  onHireManager: () => void;
  onUnlockApp: (appId: string) => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  state,
  onBuyUpgrade,
  onBuyLevelUpgrade,
  onHireManager,
  onUnlockApp,
}) => {
  const mealPriceLevel = Math.round((state.upgrades.mealPrice - 10) / 5);
  const cookingSpeedLevel = Math.round((state.upgrades.cookingSpeed - 1) / 0.5);
  const spawnRateLevel = Math.round((state.upgrades.spawnRate - 1) / 0.5);

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <ArrowUpCircle size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Staffing, Equipment & Delivery Networks
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Expand dining capacity, recruit workforce specialists, and onboard digital delivery partners
            </p>
          </div>
        </div>

        <div className="mc-slot px-3 py-1.5 flex items-center gap-1 text-xs font-black">
          <span className="text-[#555555] text-[9px] uppercase">Balance:</span>
          <span className="text-[#388e3c] font-black">${state.money.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
        {/* Section 1: Staff & Operations */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-2 flex items-center gap-1.5 border-b-2 border-[#8b8b8b] pb-1">
            <Users size={15} className="text-[#1565c0]" />
            Restaurant Workforce & Labor
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Waiter */}
            <UpgradeItemCard
              title="Hire Floor Waiter"
              description={`Takes customer orders and carries dishes to dining tables. Daily salary: $${SALARIES.waiter}`}
              cost={UPGRADE_COSTS.waiter(state.staff.waiters)}
              canAfford={state.money >= UPGRADE_COSTS.waiter(state.staff.waiters)}
              currentValue={`${state.staff.waiters} On Staff`}
              onBuy={() => onBuyUpgrade('waiter')}
              icon={<Users size={20} />}
              btnLabel="HIRE WAITER"
            />

            {/* Chef */}
            <UpgradeItemCard
              title="Hire Line Chef"
              description={`Prepares ordered dishes simultaneously at the kitchen stove. Daily salary: $${SALARIES.chef}`}
              cost={UPGRADE_COSTS.chef(state.staff.chefs)}
              canAfford={state.money >= UPGRADE_COSTS.chef(state.staff.chefs)}
              currentValue={`${state.staff.chefs} On Staff`}
              onBuy={() => onBuyUpgrade('chef')}
              icon={<ChefHat size={20} />}
              btnLabel="HIRE CHEF"
            />

            {/* Cleaner */}
            <UpgradeItemCard
              title="Hire Busser / Cleaner"
              description={`Automatically wipes dirty tables so new customers can be seated. Daily salary: $${SALARIES.cleaner}`}
              cost={0}
              canAfford={(state.staff.cleaners || 0) < 3}
              currentValue={`${state.staff.cleaners || 0} / 3 Max`}
              onBuy={() => onBuyUpgrade('cleaner')}
              icon={<Eraser size={20} />}
              btnLabel={(state.staff.cleaners || 0) >= 3 ? "STAFF MAXED" : "HIRE CLEANER (FREE)"}
            />

            {/* Manager */}
            <UpgradeItemCard
              title="Automated Purchasing Manager"
              description={`Monitors pantry levels and auto-orders needed ingredients before dishes run out. Daily fee: $${SALARIES.manager}`}
              cost={0}
              canAfford={!state.staff.hasManager}
              currentValue={state.staff.hasManager ? "Active In Office" : "Not Hired"}
              onBuy={onHireManager}
              icon={<UserCheck size={20} />}
              btnLabel={state.staff.hasManager ? "MANAGER ACTIVE" : "HIRE MANAGER (FREE)"}
            />
          </div>
        </div>

        {/* Section 2: Equipment & Dining Capacity */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-2 flex items-center gap-1.5 border-b-2 border-[#8b8b8b] pb-1">
            <Coffee size={15} className="text-[#d97706]" />
            Dining Capacity & Facility Enhancements
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Table */}
            <UpgradeItemCard
              title="Install Dining Table"
              description="Adds a new 4-top table to the dining floor to serve more concurrent guest parties."
              cost={UPGRADE_COSTS.table(state.tables.length)}
              canAfford={state.money >= UPGRADE_COSTS.table(state.tables.length)}
              currentValue={`${state.tables.length} Tables Active`}
              onBuy={() => onBuyUpgrade('table')}
              icon={<Coffee size={20} />}
              btnLabel="INSTALL TABLE"
            />

            {/* Cooking Speed */}
            <UpgradeItemCard
              title="Culinary Prep Speed"
              description="High-output commercial stoves and utensils shorten customer wait times."
              cost={UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
              canAfford={state.money >= UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
              currentValue={`Tier ${cookingSpeedLevel} (+${(cookingSpeedLevel * 50)}% Speed)`}
              onBuy={() => onBuyLevelUpgrade('cookingSpeed', cookingSpeedLevel)}
              icon={<Clock size={20} />}
              btnLabel="UPGRADE KITCHEN"
            />

            {/* Marketing */}
            <UpgradeItemCard
              title="Local Marketing & Billboards"
              description="Draws larger customer waves and steady foot traffic to your dining room."
              cost={UPGRADE_COSTS.spawnRate(spawnRateLevel)}
              canAfford={state.money >= UPGRADE_COSTS.spawnRate(spawnRateLevel)}
              currentValue={`Level ${spawnRateLevel}`}
              onBuy={() => onBuyLevelUpgrade('spawnRate', spawnRateLevel)}
              icon={<Users size={20} />}
              btnLabel="BOOST MARKETING"
            />

            {/* Meal Price / Gourmet Ingredients */}
            <UpgradeItemCard
              title="Artisanal Ingredient Quality"
              description="Enhances dining reputation, allowing all standard meals to command a higher base price."
              cost={UPGRADE_COSTS.mealPrice(mealPriceLevel)}
              canAfford={state.money >= UPGRADE_COSTS.mealPrice(mealPriceLevel)}
              currentValue={`+$${state.upgrades.mealPrice} per meal`}
              onBuy={() => onBuyLevelUpgrade('mealPrice', mealPriceLevel)}
              icon={<Utensils size={20} />}
              btnLabel="UPGRADE QUALITY"
            />
          </div>
        </div>

        {/* Section 3: Digital Delivery Networks */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-2 flex items-center gap-1.5 border-b-2 border-[#8b8b8b] pb-1">
            <Smartphone size={15} className="text-[#7e22ce]" />
            Online Delivery App Integrations
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(ONLINE_APPS).map(([id, app]) => {
              const isUnlocked = state.unlockedApps.includes(id);
              const canAfford = state.money >= app.cost;

              return (
                <div
                  key={id}
                  className={`mc-inner-panel p-3.5 flex flex-col justify-between border-2 transition-all ${
                    isUnlocked
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-[#373737] bg-[#f8fafc]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <h5 className="font-black text-xs uppercase tracking-wider text-[#2b2b2b]">
                        {app.name}
                      </h5>
                      {isUnlocked ? (
                        <span className="mc-slot px-1.5 py-0.5 text-[8px] font-black uppercase bg-[#2e7d32] text-white flex items-center gap-0.5">
                          <Check size={9} /> Subscribed
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-[#64748b]">
                          {Math.round(app.fee * 100)}% Fee
                        </span>
                      )}
                    </div>

                    <p className="text-[9px] font-bold text-[#64748b] uppercase mb-2">
                      Streams virtual delivery tickets directly to your line chefs without using floor tables.
                    </p>
                  </div>

                  <button
                    onClick={() => onUnlockApp(id)}
                    disabled={isUnlocked || !canAfford}
                    className={`w-full py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                      isUnlocked
                        ? 'mc-slot text-[#888888] cursor-not-allowed opacity-60'
                        : canAfford
                        ? 'mc-button-purple'
                        : 'mc-slot text-[#888888] cursor-not-allowed'
                    }`}
                  >
                    {isUnlocked ? "PLATFORM ACTIVE" : `SUBSCRIBE ($${app.cost})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function UpgradeItemCard({
  title,
  description,
  cost,
  canAfford,
  currentValue,
  onBuy,
  icon,
  btnLabel
}: {
  title: string;
  description: string;
  cost: number;
  canAfford: boolean;
  currentValue: string;
  onBuy: () => void;
  icon: React.ReactNode;
  btnLabel?: string;
}) {
  return (
    <div className="mc-inner-panel p-3.5 flex flex-col justify-between bg-[#f8fafc] border-2 border-[#373737] shadow-sm">
      <div>
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 mc-slot bg-[#475569] text-white rounded shadow-inner">
              {icon}
            </div>
            <div>
              <h5 className="font-black text-xs uppercase tracking-wider text-[#2b2b2b]">
                {title}
              </h5>
              <span className="text-[9px] font-black text-[#1565c0] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase inline-block mt-0.5">
                {currentValue}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[9px] font-bold text-[#64748b] uppercase mb-3 leading-relaxed">
          {description}
        </p>
      </div>

      <button
        onClick={onBuy}
        disabled={!canAfford}
        className={`w-full py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-sm ${
          canAfford ? 'mc-button-green' : 'mc-slot text-[#888888] cursor-not-allowed opacity-75'
        }`}
      >
        {cost > 0 ? (
          <>
            <span>{btnLabel || "PURCHASE"}</span>
            <span className="font-mono">(${cost.toLocaleString()})</span>
          </>
        ) : (
          btnLabel || "CLAIM"
        )}
      </button>
    </div>
  );
}
