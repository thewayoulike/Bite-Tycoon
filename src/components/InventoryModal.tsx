import React, { useState } from 'react';
import { Package, Search, AlertTriangle, CheckCircle2, Layers, DollarSign } from 'lucide-react';
import { INGREDIENTS } from '../data/recipes';
import { INGREDIENT_ICONS, INGREDIENT_CATEGORIES, CATEGORY_LABELS } from '../data/categories';

export type InventoryItem = {id:string;name:string;cost:number;category:string;icon?:string};
export type InventoryCatalog = {
  items: InventoryItem[]; title:string; subtitle:string; neededLabel:string; neededIds:string[];
  capacity?:number; lowStock?:number; quote?:(item:InventoryItem,qty:number)=>number;
  itemActions?:(id:string)=>React.ReactNode;
};
interface InventoryModalProps {
  catalog?: InventoryCatalog;
  inventory: Record<string, number>;
  inventoryBatches: Record<string, { qty: number; costPerUnit: number }[]>;
  money: number;
  unlockedRecipes: { ingredients: Record<string, number> }[];
  onBuyIngredient: (id: string, qty: number, discount: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  catalog,
  inventory,
  inventoryBatches,
  money,
  unlockedRecipes,
  onBuyIngredient,
}) => {
  const [filterTab, setFilterTab] = useState<'needed' | 'all'>('needed');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('rice');

  const items:Record<string,InventoryItem> = Object.fromEntries((catalog?.items ?? Object.values(INGREDIENTS).map(item=>({...item,category:INGREDIENT_CATEGORIES[item.id]||'General',icon:INGREDIENT_ICONS[item.id]}))).map(item=>[item.id,item]));
  const neededSet = new Set(catalog?.neededIds ?? unlockedRecipes.flatMap(r=>Object.keys(r.ingredients||{})));
  const neededList = [...neededSet];
  const lowAt=catalog?.lowStock??5;
  const lowStockCount = neededList.filter(id => (inventory[id] || 0) < lowAt).length;
  const categories=catalog?[{id:'all',label:'All',icon:'📦'},...Array.from(new Set(catalog.items.map(i=>i.category))).map(id=>({id,label:id,icon:''}))]:CATEGORY_LABELS;
  const displayIds=Object.keys(items).filter(id=>(filterTab==='all'||neededSet.has(id))&&(category==='all'||items[id].category===category)&&items[id].name.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedItem=items[displayIds.includes(selectedItemId)?selectedItemId:displayIds[0]];
  const currentStock=selectedItem?(inventory[selectedItem.id]||0):0;
  const batches=(selectedItem&&inventoryBatches[selectedItem.id])||[];
  const nextUnitCost=batches.length?batches[0].costPerUnit:(selectedItem?.cost||0);
  const totalBatchValue=catalog?currentStock*(selectedItem?.cost||0):batches.reduce((sum,b)=>sum+b.qty*b.costPerUnit,0);
  const blendedAvgCost=currentStock>0?totalBatchValue/currentStock:(selectedItem?.cost||0);
  const quote=(item:InventoryItem,qty:number,discount=0)=>catalog?.quote?.(item,qty)??item.cost*qty*(1-discount);
  const tiers=catalog?[{qty:10,discount:0,label:'Order 10x',badge:'Standard',btnClass:'mc-button'},{qty:25,discount:0,label:'Order 25x',badge:'Stock up',btnClass:'mc-button-blue'},{qty:50,discount:0,label:'Order 50x',badge:'Large order',btnClass:'mc-button-green'}]:[
    {qty:10,discount:0,label:'Retail 10x',badge:'Standard',btnClass:'mc-button'},
    {qty:50,discount:.1,label:'Bulk 50x',badge:'-10%',btnClass:'mc-button-blue'},
    {qty:100,discount:.2,label:'Wholesale 100x',badge:'-20%',btnClass:'mc-button-green'},
    {qty:500,discount:.3,label:'Industrial 500x',badge:'-30%',btnClass:'mc-button-purple'}];
  const handleRestockAllLow=()=>{
    let remaining=money;
    for(const id of neededList){const item=items[id],stock=inventory[id]||0;if(!item||stock>=lowAt)continue;
      const qty=Math.max(0,Math.min(catalog?25:50,(catalog?.capacity??Infinity)-stock)),discount=catalog?0:.1,cost=quote(item,qty,discount);
      if(qty&&remaining>=cost){onBuyIngredient(id,qty,discount);remaining-=cost;}
    }
  };

  return (
    <div className="inventory-console flex flex-col h-full font-mono">
      {/* Top Header & Quick Restock Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <Package size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              {catalog?.title??'Pantry & FIFO Batch Inventory'}
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              {catalog?.subtitle??'First-In-First-Out (FIFO) consumption tracks exact purchase costs for every meal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <button
              onClick={handleRestockAllLow}
              className="px-3 py-1.5 mc-button-gold text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow"
              title={`Restock required items below ${lowAt} units using this business’s cash`}
            >
              <AlertTriangle size={14} className="animate-pulse" />
              Restock Low ({lowStockCount})
            </button>
          )}

          <div className="mc-slot px-3 py-1.5 flex items-center gap-1 text-xs font-black">
            <span className="text-[#555555] text-[9px] uppercase">Cash:</span>
            <span className="text-[#388e3c] font-black">${money.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[460px]">
        {/* Left Column: Grid, Filters & Search */}
        <div className="flex-1 flex flex-col mc-inner-panel p-3 min-w-0">
          {/* Primary View Filters & Search */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterTab('needed')}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    filterTab === 'needed' ? 'mc-button-selected' : 'mc-button'
                  }`}
                >
                  <CheckCircle2 size={13} className="text-[#2e7d32]" />
                  <span>{catalog?.neededLabel??'Needed By Menu'} ({neededSet.size})</span>
                </button>
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                    filterTab === 'all' ? 'mc-button-selected' : 'mc-button'
                  }`}
                >
                  <span>All Items ({Object.keys(items).length})</span>
                </button>
              </div>

              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#666666]" />
                <input
                  type="text"
                  aria-label="Search inventory" placeholder={catalog?'SEARCH INVENTORY...':'SEARCH PANTRY...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#f1f5f9] border-2 border-[#373737] pl-8 pr-3 py-1 text-xs font-bold uppercase text-[#2b2b2b] outline-none shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1.5 text-[10px] font-black text-[#888888] hover:text-black"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    category === cat.id ? 'mc-button-selected' : 'mc-button'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ingredient Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[350px]">
            {displayIds.length === 0 ? (
              <div className="text-center py-12 text-[#555555] font-black uppercase text-xs">
                No items found matching filters.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
                {displayIds.map(id => {
                  const item = items[id];
                  const stock = inventory[id] || 0;
                  const isSelected = selectedItem?.id === id;
                  const isLow = stock < lowAt;
                  const isOut = stock === 0;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedItemId(id)}
                      className={`aspect-square flex flex-col items-center justify-between p-1 relative transition-all border-2 ${
                        isSelected
                          ? 'mc-button-selected border-blue-600 ring-2 ring-blue-500 scale-[0.98]'
                          : isOut
                          ? 'mc-button border-red-500 bg-red-50/40'
                          : isLow
                          ? 'mc-button border-amber-500 bg-amber-50/40'
                          : 'mc-button border-[#373737]'
                      }`}
                    >
                      {/* Top Status Tag */}
                      <div className="w-full flex justify-end">
                        {isOut ? (
                          <span className="text-[7px] font-black bg-red-600 text-white px-1 rounded-sm leading-none">
                            OUT
                          </span>
                        ) : isLow ? (
                          <span className="text-[7px] font-black bg-amber-500 text-black px-1 rounded-sm leading-none">
                            LOW
                          </span>
                        ) : null}
                      </div>

                      {/* Icon */}
                      <span className="text-2xl drop-shadow-sm leading-none -mt-1" style={{ imageRendering: 'pixelated' }}>
                        {items[id]?.icon || "📦"}
                      </span>

                      {/* Label & Stock */}
                      <div className="w-full text-center">
                        <span className="text-[8px] font-black uppercase truncate block w-full px-0.5 leading-tight text-[#2b2b2b]">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] font-black leading-tight ${
                            isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                          }`}
                        >
                          {Number(stock.toFixed(1))}x
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Ingredient & FIFO Inspector & Purchasing */}
        <div className="w-full lg:w-80 mc-inner-panel p-4 flex flex-col justify-between shrink-0 bg-[#d4d4d4]">
          {selectedItem ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                {/* Header of Item */}
                <div className="flex items-center gap-3 border-b-2 border-[#8b8b8b] pb-2 mb-3">
                  <div
                    className="w-14 h-14 mc-slot flex items-center justify-center text-3xl bg-white border-2 border-[#373737] shadow-inner"
                    style={{ imageRendering: 'pixelated' }}
                  >
                    {selectedItem.icon || "📦"}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider text-[#2b2b2b]">
                      {selectedItem.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="mc-slot px-1.5 py-0.5 text-[8px] font-black uppercase bg-[#475569]">
                        {selectedItem.category}
                      </span>
                      <span className="text-[9px] font-bold text-[#555555]">
                        Base: ${selectedItem.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Stock Banner */}
                <div className="mc-slot p-2.5 flex items-center justify-between mb-3 shadow-inner bg-[#475569]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#cbd5e1]">
                    Current In Stock:
                  </span>
                  <span
                    className={`text-xl font-black ${
                      currentStock === 0 ? 'text-red-400' : currentStock < lowAt ? 'text-amber-300' : 'text-green-300'
                    }`}
                  >
                    {Number(currentStock.toFixed(1))} units{catalog?.capacity?` / ${catalog.capacity}`:null}
                  </span>
                </div>

                {/* FIFO Accounting Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#f8fafc] border-2 border-[#94a3b8] p-2 rounded shadow-inner">
                    <span className="text-[8px] font-bold text-[#64748b] uppercase block">
                      {catalog?'Unit purchase cost':'Next Unit Cost (FIFO)'}
                    </span>
                    <span className="text-sm font-black text-[#b91c1c] flex items-center gap-0.5">
                      <DollarSign size={12} /> {nextUnitCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-[#f8fafc] border-2 border-[#94a3b8] p-2 rounded shadow-inner">
                    <span className="text-[8px] font-bold text-[#64748b] uppercase block">
                      {catalog?'Stock value':'Blended Avg Cost'}
                    </span>
                    <span className="text-sm font-black text-[#1565c0] flex items-center gap-0.5">
                      <DollarSign size={12} /> {(catalog?totalBatchValue:blendedAvgCost).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* FIFO Active Batch Queue Breakdown */}
                <div className="mb-3">
                  {catalog?<div className="mc-slot p-3 text-xs"><strong>THIS PROPERTY’S STOCKROOM</strong><p className="mt-2">{catalog.capacity?`Up to ${catalog.capacity} units per item. `:""}Orders use this business’s cash. Supplies are used as this property serves customers.</p>{catalog.itemActions?.(selectedItem.id)}</div>:<>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-[#555555] mb-1">
                    <span className="flex items-center gap-1">
                      <Layers size={11} /> FIFO Queue ({batches.length} Batches)
                    </span>
                    <span>Total Value: ${totalBatchValue.toFixed(2)}</span>
                  </div>

                  <div className="mc-slot p-2 max-h-[110px] overflow-y-auto custom-scrollbar flex flex-col gap-1 shadow-inner bg-[#334155]">
                    {batches.length === 0 ? (
                      <div className="text-center py-4 text-[9px] font-bold text-[#94a3b8] uppercase">
                        No batches in storage. Buy below to stock!
                      </div>
                    ) : (
                      batches.map((batch, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white text-[#2b2b2b] px-2 py-1 rounded text-[9px] font-bold border border-[#475569]"
                        >
                          <span className="flex items-center gap-1 font-black">
                            {idx === 0 && <span className="text-red-600 font-black">● [Next]</span>}
                            Batch #{idx + 1}
                          </span>
                          <span className="text-[#334155]">
                            {batch.qty} units @ <span className="font-black text-emerald-700">${batch.costPerUnit.toFixed(2)}</span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>}
                </div>
              </div>

              {/* Purchase Tiers Buttons */}
              <div>
                <div className="text-[9px] font-black text-[#555555] uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Procurement Tier</span>
                  <span>Unit Price</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tiers.map(tier => {
                    const discountedUnitCost = selectedItem.cost * (1 - tier.discount);
                    const qty=Math.max(0,Math.min(tier.qty,(catalog?.capacity??Infinity)-currentStock));
                    const totalPrice=quote(selectedItem,qty,tier.discount);
                    const canAfford = qty>0 && money >= totalPrice;

                    return (
                      <button
                        key={tier.qty}
                        onClick={() => onBuyIngredient(selectedItem.id, qty, tier.discount)}
                        disabled={!canAfford}
                        className={`w-full py-1.5 px-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-between rounded transition-all active:scale-[0.98] ${
                          canAfford ? tier.btnClass : 'mc-slot text-[#888888] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{catalog?(qty?`Order ${Number(qty.toFixed(1))}x`:'Stockroom full'):tier.label}</span>
                          <span className="text-[8px] bg-black/30 px-1 rounded text-white font-mono">
                            {tier.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] opacity-80 font-mono">
                            (${discountedUnitCost.toFixed(2)}/ea)
                          </span>
                          <span className="font-black">
                            ${totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#555555] font-black uppercase text-xs">
              <Package size={32} className="mb-2 opacity-50" />
              Select an item from the inventory grid.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
