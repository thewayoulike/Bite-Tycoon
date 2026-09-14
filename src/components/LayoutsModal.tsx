import React from 'react';
import { PaintBucket, Check, RotateCcw, Palette, Sparkles } from 'lucide-react';

interface LayoutsModalProps {
  restaurantLayout: number;
  wallColor: string | null;
  frameColor: string | null;
  onSetLayout: (layoutIndex: number) => void;
  onSetWallColor: (color: string | null) => void;
  onSetFrameColor: (color: string | null) => void;
}

export const LayoutsModal: React.FC<LayoutsModalProps> = ({
  restaurantLayout,
  wallColor,
  frameColor,
  onSetLayout,
  onSetWallColor,
  onSetFrameColor,
}) => {
  const layouts = [
    { name: "Classic Diner", desc: "Traditional timber frames with 4-pane window grids" },
    { name: "Modern Panoramic", desc: "Expansive glass wall maximizing street daylight" },
    { name: "Classic Tall", desc: "Victorian style elongated vertical sash panes" },
    { name: "Bistro High Lights", desc: "High clerestory windows creating cozy intimate dining" },
    { name: "Urban Storefront", desc: "Full floor-to-ceiling downtown bistro frontage" },
    { name: "Solid Brickwork", desc: "Maximum privacy brick exterior with minimal glazing" }
  ];

  const presetThemes = [
    { name: "Classic Wood", wall: "#f1f5f9", frame: "#451a03" },
    { name: "Modern Slate", wall: "#e2e8f0", frame: "#1e293b" },
    { name: "Warm Cafe", wall: "#fef3c7", frame: "#78350f" },
    { name: "Mint Fresh", wall: "#dcfce7", frame: "#14532d" },
    { name: "Rose Boutique", wall: "#fee2e2", frame: "#7f1d1d" },
    { name: "Midnight Neon", wall: "#1e293b", frame: "#fbbf24" },
    { name: "Ocean Breeze", wall: "#e0f2fe", frame: "#0369a1" },
    { name: "Monochrome Pro", wall: "#f8fafc", frame: "#0f172a" }
  ];

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <PaintBucket size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Diner Architecture & Visual Styling
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Customize restaurant facade, architectural window treatments, and interior paint themes
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
        {/* Custom Color Pickers Section */}
        <div className="mc-inner-panel p-4 bg-[#f8fafc] border-2 border-[#373737]">
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-3 flex items-center gap-2">
            <Palette size={16} className="text-[#334155]" />
            Custom Color Palette
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wall Color */}
            <div className="bg-[#e2e8f0] p-3 rounded border border-[#cbd5e1] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-[#555555] uppercase block">
                  Wall Surface Color
                </span>
                <span className="text-xs font-mono font-black text-[#2b2b2b]">
                  {wallColor || "#f1f5f9 (Default)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border-2 border-[#373737] relative overflow-hidden shadow cursor-pointer"
                  style={{ backgroundColor: wallColor || "#f1f5f9" }}
                >
                  <input
                    type="color"
                    value={wallColor || "#f1f5f9"}
                    onChange={e => onSetWallColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </div>
                {wallColor && (
                  <button
                    onClick={() => onSetWallColor(null)}
                    className="p-1.5 mc-button text-[9px] font-black uppercase"
                    title="Reset to default"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Frame Color */}
            <div className="bg-[#e2e8f0] p-3 rounded border border-[#cbd5e1] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-[#555555] uppercase block">
                  Frames, Sills & Door
                </span>
                <span className="text-xs font-mono font-black text-[#2b2b2b]">
                  {frameColor || "#451a03 (Default)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border-2 border-[#373737] relative overflow-hidden shadow cursor-pointer"
                  style={{ backgroundColor: frameColor || "#451a03" }}
                >
                  <input
                    type="color"
                    value={frameColor || "#451a03"}
                    onChange={e => onSetFrameColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </div>
                {frameColor && (
                  <button
                    onClick={() => onSetFrameColor(null)}
                    className="p-1.5 mc-button text-[9px] font-black uppercase"
                    title="Reset to default"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preset Palettes */}
        <div className="mc-inner-panel p-4 bg-[#f8fafc] border-2 border-[#373737]">
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-[#d97706]" />
            Designer Color Combinations
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presetThemes.map((theme, i) => (
              <button
                key={i}
                onClick={() => {
                  onSetWallColor(theme.wall);
                  onSetFrameColor(theme.frame);
                }}
                className="mc-button p-2.5 flex flex-col items-center text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* 2-Tone Swatch Box */}
                <div className="w-full h-7 rounded border-2 border-[#373737] flex overflow-hidden mb-1.5 shadow-sm">
                  <div className="w-2/3 h-full" style={{ backgroundColor: theme.wall }} />
                  <div className="w-1/3 h-full" style={{ backgroundColor: theme.frame }} />
                </div>
                <span className="text-[9px] font-black text-[#2b2b2b] uppercase tracking-wider truncate w-full">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Architectural Formats */}
        <div className="mc-inner-panel p-4 bg-[#f8fafc] border-2 border-[#373737]">
          <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b] mb-3">
            Facade & Window Glazing Architecture
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {layouts.map((design, i) => {
              const isActive = restaurantLayout === i;
              return (
                <div
                  key={i}
                  className={`p-3 rounded border-2 flex flex-col justify-between transition-all ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500'
                      : 'border-[#94a3b8] bg-white'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-xs uppercase tracking-wider text-[#2b2b2b]">
                        {design.name}
                      </span>
                      {isActive && (
                        <span className="mc-slot px-2 py-0.5 text-[8px] font-black uppercase bg-[#2e7d32] text-white flex items-center gap-1">
                          <Check size={10} /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-[#64748b] uppercase">
                      {design.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => onSetLayout(i)}
                    disabled={isActive}
                    className={`w-full py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                      isActive
                        ? 'mc-slot text-[#888888] cursor-not-allowed opacity-60'
                        : 'mc-button-green'
                    }`}
                  >
                    {isActive ? "Currently Applied" : "Install Architectural Format"}
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
