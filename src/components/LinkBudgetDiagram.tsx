import React, { useState } from 'react';
import {
  LinkBudgetCalculationResult,
  LinkBudgetInputs
} from '../types/telecom';
import { Radio, ArrowDownRight, ArrowUpRight, Cpu, ShieldAlert, Sparkles, Eye, Info } from 'lucide-react';

interface LinkBudgetDiagramProps {
  result: LinkBudgetCalculationResult;
  inputs: LinkBudgetInputs;
}

export const LinkBudgetDiagram: React.FC<LinkBudgetDiagramProps> = ({ result, inputs }) => {
  const [showDetails, setShowDetails] = useState(true);

  // Determine Base Station Node designation as requested:
  // eNB in case of 4G, gNB in case of 5G SA, eNB / gNB in case of 5G NSA
  const bsNodeDesignation = inputs.technology === '4G'
    ? 'eNB'
    : inputs.technology === '5G_NSA'
    ? 'eNB / gNB'
    : 'gNB';

  const techTitle = inputs.technology === '4G'
    ? '4G LTE'
    : inputs.technology === '5G_NSA'
    ? '5G NSA (EN-DC)'
    : '5G NR SA';

  const isUlLimited = result.bottleneck === 'UL_LIMITED';
  const isDlLimited = result.bottleneck === 'DL_LIMITED';

  const cellRadiusDisplay = result.maxCellRangeKm >= 1
    ? `${result.maxCellRangeKm.toFixed(2)} km`
    : `${result.maxCellRangeMeters} m`;

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-2xl transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-950/80 border border-cyan-800/70 rounded-lg text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white tracking-wide">
                Interactive Link Budget Topology &amp; Physical RF Visualization
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/70 text-cyan-300 font-semibold uppercase">
                {techTitle}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live link budget outputs mapped dynamically onto base station, RF beam propagation, and user terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showDetails ? 'Hide Callouts' : 'Show Callouts'}</span>
          </button>
        </div>
      </div>

      {/* Main Vector Diagram Container */}
      <div className="relative w-full aspect-[16/9] max-h-[580px] bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 rounded-lg overflow-hidden border border-slate-800/60 shadow-inner flex items-center justify-center">
        <svg
          viewBox="0 0 1000 520"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1329" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="85%" stopColor="#fb923c" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="dlArrowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            <linearGradient id="ulArrowGrad" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a1e" />
              <stop offset="25%" stopColor="#142c16" />
              <stop offset="100%" stopColor="#0a180b" />
            </linearGradient>

            <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d5232" />
              <stop offset="100%" stopColor="#152918" />
            </linearGradient>

            {/* Arrowhead Markers */}
            <marker id="arrowDl" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" stroke="#1e293b" strokeWidth="1" />
            </marker>

            <marker id="arrowUl" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#e11d48" stroke="#1e293b" strokeWidth="1" />
            </marker>

            <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#94a3b8" />
            </marker>

            <marker id="dimArrowRev" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 8 2 L 0 5 L 8 8 z" fill="#94a3b8" />
            </marker>

            {/* Drop Shadow Filter */}
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* 1. SKY BACKGROUND */}
          <rect x="0" y="0" width="1000" height="520" fill="url(#skyGrad)" />

          {/* Stylized Clouds */}
          <g opacity="0.25">
            <ellipse cx="380" cy="110" rx="90" ry="22" fill="#94a3b8" />
            <ellipse cx="440" cy="100" rx="60" ry="18" fill="#94a3b8" />
            <ellipse cx="720" cy="140" rx="110" ry="24" fill="#94a3b8" />
            <ellipse cx="780" cy="130" rx="70" ry="20" fill="#94a3b8" />
          </g>

          {/* 2. TOP RIGHT DIAGRAM TITLE */}
          <g id="diagramTitle">
            <text
              x="710"
              y="65"
              textAnchor="middle"
              style={{
                fontSize: '19.75px',
                fontStyle: 'normal',
                fontWeight: 'bold',
                fontFamily: 'Courier New'
              }}
              fill="#ffffff"
              letterSpacing="0.05em"
            >
              {techTitle} LINK BUDGET
            </text>
            <text x="710" y="85" textAnchor="middle" className="font-mono text-xs" fill="#94a3b8">
              Band {inputs.band} ({inputs.duplexMode}) · {inputs.bandwidthMHz} MHz · {inputs.propagationModel}
            </text>
          </g>

          {/* 3. ROLLING HILLS & ENVIRONMENT */}
          <path
            d="M 0 455 Q 220 420 440 435 T 880 430 Q 940 435 1000 440 L 1000 520 L 0 520 Z"
            fill="url(#hillGrad)"
          />
          <path
            d="M 0 465 Q 280 445 550 455 T 1000 460 L 1000 520 L 0 520 Z"
            fill="url(#groundGrad)"
          />

          {/* Trees around the tower and UE */}
          {/* Tree cluster near tower */}
          <g transform="translate(105, 375)">
            {/* Trunk */}
            <rect x="18" y="55" width="6" height="25" fill="#3e2723" rx="1" />
            {/* Foliage */}
            <ellipse cx="21" cy="45" rx="22" ry="32" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
            <ellipse cx="21" cy="35" rx="16" ry="24" fill="#388e3c" />
          </g>
          <g transform="translate(290, 395)">
            {/* Pine tree */}
            <rect x="18" y="45" width="5" height="25" fill="#2d1c16" />
            <polygon points="20,10 6,35 34,35" fill="#1b5e20" />
            <polygon points="20,25 4,50 36,50" fill="#2e7d32" />
            <polygon points="20,40 2,62 38,62" fill="#1e4620" />
          </g>
          <g transform="translate(325, 410)">
            {/* Round tree */}
            <rect x="12" y="30" width="5" height="22" fill="#3e2723" />
            <circle cx="14" cy="24" r="16" fill="#33691e" stroke="#1b5e20" strokeWidth="1.5" />
          </g>

          {/* Tree cluster near UE */}
          <g transform="translate(895, 365)">
            {/* Large round tree behind UE */}
            <rect x="22" y="65" width="7" height="30" fill="#3e2723" />
            <ellipse cx="25" cy="50" rx="25" ry="36" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
            <ellipse cx="25" cy="38" rx="18" ry="28" fill="#43a047" />
          </g>

          {/* 4. RF RADIATION BEAM CONE & WAVEFRONTS */}
          {/* Shaded Beam Lobe */}
          <path
            d="M 235 140 Q 560 170 840 370 Q 520 310 235 160 Z"
            fill="url(#beamGrad)"
          />
          {/* Concentric RF Wavefront Arcs */}
          <g stroke="#38bdf8" fill="none" opacity="0.35">
            <path d="M 280 120 A 70 70 0 0 1 295 185" strokeWidth="2.5" />
            <path d="M 330 115 A 130 130 0 0 1 360 215" strokeWidth="2.5" />
            <path d="M 390 115 A 190 190 0 0 1 430 245" strokeWidth="2.5" />
            <path d="M 460 120 A 260 260 0 0 1 510 280" strokeWidth="2" strokeDasharray="6 4" />
            <path d="M 540 130 A 340 340 0 0 1 600 320" strokeWidth="2" strokeDasharray="6 4" />
            <path d="M 630 145 A 430 430 0 0 1 700 365" strokeWidth="2" strokeDasharray="6 4" />
          </g>

          {/* 5. BASE STATION TELECOM TOWER (gNB / eNB) */}
          <g id="telecomTower">
            {/* Tower Foundation */}
            <rect x="175" y="445" width="45" height="12" fill="#334155" stroke="#1e293b" strokeWidth="1.5" rx="2" />
            <rect x="235" y="445" width="45" height="12" fill="#334155" stroke="#1e293b" strokeWidth="1.5" rx="2" />

            {/* Main Lattice Legs */}
            {/* Left leg: (185, 445) to (225, 140) */}
            {/* Right leg: (270, 445) to (235, 140) */}
            <line x1="185" y1="445" x2="225" y2="140" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="270" y1="445" x2="235" y2="140" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

            {/* Horizontal Struts */}
            <line x1="192" y1="390" x2="263" y2="390" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="200" y1="330" x2="255" y2="330" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="208" y1="270" x2="247" y2="270" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="216" y1="210" x2="240" y2="210" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="223" y1="150" x2="237" y2="150" stroke="#94a3b8" strokeWidth="2.5" />

            {/* Diagonal Cross Braces (X patterns) */}
            <line x1="185" y1="445" x2="263" y2="390" stroke="#64748b" strokeWidth="2" />
            <line x1="270" y1="445" x2="192" y2="390" stroke="#64748b" strokeWidth="2" />

            <line x1="192" y1="390" x2="255" y2="330" stroke="#64748b" strokeWidth="2" />
            <line x1="263" y1="390" x2="200" y2="330" stroke="#64748b" strokeWidth="2" />

            <line x1="200" y1="330" x2="247" y2="270" stroke="#64748b" strokeWidth="2" />
            <line x1="255" y1="330" x2="208" y2="270" stroke="#64748b" strokeWidth="2" />

            <line x1="208" y1="270" x2="240" y2="210" stroke="#64748b" strokeWidth="2" />
            <line x1="247" y1="270" x2="216" y2="210" stroke="#64748b" strokeWidth="2" />

            <line x1="216" y1="210" x2="237" y2="150" stroke="#64748b" strokeWidth="2" />
            <line x1="240" y1="210" x2="223" y2="150" stroke="#64748b" strokeWidth="2" />

            {/* Middle Service Platform */}
            <rect x="210" y="267" width="36" height="5" fill="#475569" rx="1" />
            <line x1="210" y1="262" x2="246" y2="262" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Top Antenna Head Mount & Platform */}
            <rect x="218" y="137" width="24" height="6" fill="#334155" stroke="#1e293b" strokeWidth="1" rx="1" />
            <line x1="214" y1="130" x2="246" y2="130" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Central Mast */}
            <line x1="230" y1="140" x2="230" y2="90" stroke="#94a3b8" strokeWidth="3" />
            {/* Lightning Spire */}
            <line x1="230" y1="90" x2="230" y2="70" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Directional Cellular Antenna Panels (Sector Panels) */}
            <rect x="214" y="98" width="7" height="38" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" rx="1.5" />
            <line x1="217" y1="104" x2="217" y2="130" stroke="#94a3b8" strokeWidth="1" />

            <rect x="226" y="94" width="8" height="42" fill="#ffffff" stroke="#1e293b" strokeWidth="2" rx="1.5" />
            <line x1="230" y1="100" x2="230" y2="130" stroke="#0ea5e9" strokeWidth="1.5" />

            <rect x="238" y="98" width="7" height="38" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" rx="1.5" />
            <line x1="241" y1="104" x2="241" y2="130" stroke="#94a3b8" strokeWidth="1" />
          </g>

          {/* 6. BASE STATION DESIGNATION CALLOUT (gNB / eNB) */}
          <g id="bsDesignation">
            <line x1="170" y1="75" x2="218" y2="96" stroke="#000000" strokeWidth="2.5" />
            <polygon points="218,96 206,92 210,102" fill="#000000" />
            <rect x="95" y="45" width="105" height="34" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" filter="url(#cardShadow)" />
            <text x="147" y="67" textAnchor="middle" className="font-mono font-bold text-sm" fill="#38bdf8">
              {bsNodeDesignation}
            </text>
          </g>

          {/* 7. ANTENNA HEIGHT MEASUREMENT (h_b) */}
          <g id="antennaHeightDim">
            <line x1="160" y1="115" x2="160" y2="445" stroke="#000000" strokeWidth="2" />
            {/* Top Arrowhead */}
            <polygon points="160,115 155,127 165,127" fill="#000000" />
            {/* Bottom Arrowhead */}
            <polygon points="160,445 155,433 165,433" fill="#000000" />
            {/* Height Label */}
            <g transform="translate(100, 265)">
              <rect x="-42" y="-22" width="94" height="42" rx="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" filter="url(#cardShadow)" />
              <text x="5" y="-6" textAnchor="middle" style={{ fontFamily: 'Courier New' }} className="font-bold text-xs" fill="#f8fafc">
                Antenna
              </text>
              <text x="5" y="8" textAnchor="middle" style={{ fontFamily: 'Courier New' }} className="font-bold text-xs" fill="#f8fafc">
                Height (h<tspan dy="2" fontSize="9">b</tspan><tspan dy="-2">):</tspan>
              </text>
              <text x="5" y="18" textAnchor="middle" className="font-mono font-bold text-[11px]" fill="#38bdf8">
                {inputs.bsHeightMeters} m
              </text>
            </g>
          </g>

          {/* 8. DOWNLINK (DL) CURVED ARROW & CALLOUT */}
          <g id="downlinkBeamArrow">
            {/* Curved Path */}
            <path
              d="M 280 155 Q 560 220 810 345"
              fill="none"
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 280 155 Q 560 220 810 345"
              fill="none"
              stroke="url(#dlArrowGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              markerEnd="url(#arrowDl)"
            />
            {/* Downlink Text Badge on Curve */}
            <g transform="translate(565, 205) rotate(21)">
              <rect x="-65" y="-14" width="130" height="26" rx="6" fill="#0f172a" stroke="#2563eb" strokeWidth="2" filter="url(#cardShadow)" />
              <text x="0" y="4" textAnchor="middle" style={{ fontFamily: 'Courier New' }} className="font-black text-sm tracking-wide" fill="#60a5fa">
                Downlink (DL)
              </text>
            </g>
          </g>

          {/* 9. UPLINK (UL) CURVED ARROW & CALLOUT */}
          <g id="uplinkBeamArrow">
            {/* Curved Path */}
            <path
              d="M 800 375 Q 530 250 270 180"
              fill="none"
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 800 375 Q 530 250 270 180"
              fill="none"
              stroke="url(#ulArrowGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              markerEnd="url(#arrowUl)"
            />
            {/* Uplink Text Badge on Curve */}
            <g transform="translate(515, 275) rotate(20)">
              <rect x="-55" y="-14" width="110" height="26" rx="6" fill="#0f172a" stroke="#e11d48" strokeWidth="2" filter="url(#cardShadow)" />
              <text x="0" y="4" textAnchor="middle" style={{ fontFamily: 'Courier New' }} className="font-black text-sm tracking-wide" fill="#fb7185">
                Uplink (UL)
              </text>
            </g>
          </g>

          {/* 10. MOBILE USER / UE TERMINAL */}
          <g id="ueTerminal" transform="translate(850, 340)">
            {/* Pointer arrow to UE */}
            <line x1="20" y1="-10" x2="8" y2="15" stroke="#000000" strokeWidth="2" />
            <polygon points="8,15 13,4 3,9" fill="#000000" />
            {/* UE Label */}
            <rect x="15" y="-30" width="45" height="22" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="37" y="-15" textAnchor="middle" className="font-sans font-black text-xs" fill="#34d399">
              UE
            </text>

            {/* Human Figure (Stylized vector match with photo) */}
            {/* Head */}
            <circle cx="10" cy="30" r="8" fill="#ffcc80" stroke="#2d1c16" strokeWidth="1.5" />
            {/* Hair */}
            <path d="M 4 28 Q 10 20 16 28 Q 14 22 7 24 Z" fill="#4a2c11" />
            {/* Neck */}
            <line x1="10" y1="38" x2="10" y2="42" stroke="#ffcc80" strokeWidth="3" />
            {/* Torso / Warm Orange Shirt */}
            <path d="M 2 42 L 18 42 L 16 78 L 4 78 Z" fill="#f97316" stroke="#2d1c16" strokeWidth="1.5" />
            {/* Legs / Dark Blue Pants */}
            <rect x="4" y="78" width="5" height="28" fill="#1e3a8a" stroke="#1e293b" strokeWidth="1" />
            <rect x="11" y="78" width="5" height="28" fill="#1e3a8a" stroke="#1e293b" strokeWidth="1" />
            {/* Shoes */}
            <rect x="3" y="104" width="7" height="4" fill="#0f172a" rx="1" />
            <rect x="11" y="104" width="7" height="4" fill="#0f172a" rx="1" />
            {/* Arms holding phone */}
            <line x1="3" y1="46" x2="-2" y2="60" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="-2" y1="60" x2="-10" y2="52" stroke="#ffcc80" strokeWidth="3" strokeLinecap="round" />
            {/* Smartphone / UE Device */}
            <rect x="-14" y="44" width="7" height="13" rx="1.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
          </g>

          {/* 11. CELL RANGE DIMENSION LINE (d) */}
          <g id="cellRangeDim">
            {/* Left vertical reference tick at tower */}
            <line x1="230" y1="465" x2="230" y2="495" stroke="#000000" strokeWidth="2" />
            {/* Right vertical reference tick at UE */}
            <line x1="860" y1="465" x2="860" y2="495" stroke="#000000" strokeWidth="2" />
            {/* Horizontal Dimension Arrow Line */}
            <line x1="230" y1="480" x2="860" y2="480" stroke="#000000" strokeWidth="2.5" />
            <polygon points="230,480 242,475 242,485" fill="#000000" />
            <polygon points="860,480 848,475 848,485" fill="#000000" />

            {/* Dimension Badge Label */}
            <g transform="translate(545, 480)">
              <rect x="-135" y="-18" width="270" height="36" rx="6" fill="#0f172a" stroke="#000000" strokeWidth="2" filter="url(#cardShadow)" />
              <text x="0" y="-1" textAnchor="middle" style={{ fontFamily: 'Courier New' }} className="font-black text-sm tracking-wide" fill="#ffffff">
                Cell Range (d): <tspan fill="#38bdf8" className="font-mono">{cellRadiusDisplay}</tspan>
              </text>
              <text x="0" y="12" textAnchor="middle" className="font-mono text-[10px]" fill="#94a3b8">
                {result.maxCellRangeMeters.toLocaleString()} m ({inputs.coverageProbability}% target)
              </text>
            </g>
          </g>
        </svg>

        {/* 12. FLOATING REAL-TIME OUTPUT CALLOUT PANELS (Live LKB Figures) */}
        {showDetails && (
          <>
            {/* CALLOUT 1: BASE STATION RF POWER (BS EIRP & RS EPRE) */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 max-w-[210px] bg-slate-900/95 backdrop-blur-md border border-cyan-800/80 rounded-lg p-2.5 shadow-xl font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between border-b border-cyan-900/60 pb-1 mb-1">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  {bsNodeDesignation} RF Power
                </span>
                <span className="text-[9px] bg-cyan-950 px-1.5 py-0.2 rounded text-cyan-400 border border-cyan-700/60">
                  {inputs.mimoMode}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400">BS EIRP:</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {result.bsEirpDbm.toFixed(1)} dBm
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400">RS EPRE:</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {result.rsPowerDbm.toFixed(1)} dBm/RE
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-0.5 border-t border-slate-800 text-[10px] text-slate-400">
                <span>Height (h_b):</span>
                <span className="text-slate-200">{inputs.bsHeightMeters} m</span>
              </div>
            </div>

            {/* CALLOUT 2: SYSTEM MAPL & BOTTLENECK (Positioned below DL/UL arrows, grounded by terrain) */}
            <div className={`absolute bottom-[13%] sm:bottom-[15%] left-1/2 -translate-x-1/2 z-10 w-[270px] sm:w-[310px] max-w-[85vw] backdrop-blur-md rounded-xl p-2.5 sm:p-3 shadow-2xl font-mono text-center transition-all duration-300 ${
              isUlLimited
                ? 'bg-slate-950/95 border-2 border-amber-500/80 shadow-amber-950/40'
                : isDlLimited
                ? 'bg-slate-950/95 border-2 border-rose-500/80 shadow-rose-950/40'
                : 'bg-slate-950/95 border-2 border-cyan-500/80 shadow-cyan-950/40'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-300 font-semibold">
                  <Radio className={`w-3.5 h-3.5 ${
                    isUlLimited ? 'text-amber-400' : isDlLimited ? 'text-rose-400' : 'text-cyan-400'
                  }`} />
                  <span>System MAPL</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
                    {result.systemMaplDb.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400">dB</span>
                </div>
              </div>

              {/* DL vs UL MAPL Sub-metrics */}
              <div className="grid grid-cols-2 gap-1.5 mb-1.5 text-[10px]">
                <div className="bg-blue-950/70 border border-blue-800/60 rounded px-1.5 py-0.5 text-blue-200 flex justify-between items-center">
                  <span className="text-blue-400">DL:</span>
                  <span className="font-bold tabular-nums">{result.dlMaplDb.toFixed(1)} dB</span>
                </div>
                <div className="bg-rose-950/70 border border-rose-800/60 rounded px-1.5 py-0.5 text-rose-200 flex justify-between items-center">
                  <span className="text-rose-400">UL:</span>
                  <span className="font-bold tabular-nums">{result.ulMaplDb.toFixed(1)} dB</span>
                </div>
              </div>

              {/* Bottleneck Status Pill */}
              <div className="text-[10px] font-semibold flex items-center justify-center gap-1">
                {isUlLimited ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400 inline" />
                    UL Limited (Bottleneck)
                  </span>
                ) : isDlLimited ? (
                  <span className="text-rose-300 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400 inline" />
                    DL Limited (Bottleneck)
                  </span>
                ) : (
                  <span className="text-emerald-300">Balanced (UL = DL)</span>
                )}
                <span className="text-slate-400 text-[9px] font-mono">
                  · Δ{result.bottleneckDeltaDb.toFixed(1)} dB
                </span>
              </div>
            </div>

            {/* CALLOUT 3: PEAK NEAR THROUGHPUT (FOR A UE UNDER BS) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 max-w-[230px] bg-slate-900/95 backdrop-blur-md border border-emerald-800/80 rounded-lg p-2.5 shadow-xl font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1 mb-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Peak Near Throughput
                </span>
                <span className="text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded text-emerald-300 border border-emerald-700/60">
                  Near UE
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                  Peak DL:
                </span>
                <span className="text-cyan-300 font-bold tabular-nums text-xs">
                  {result.fourPoints[0].dlThroughputMbps.toFixed(0)} Mbps
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  Peak UL:
                </span>
                <span className="text-emerald-300 font-bold tabular-nums text-xs">
                  {result.fourPoints[0].ulThroughputMbps.toFixed(0)} Mbps
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-0.5 border-t border-slate-800 text-[10px] text-slate-400">
                <span>Height (h_m):</span>
                <span className="text-slate-200">{inputs.ueHeightMeters} m ({inputs.ueMimoMode || '2T4R'})</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>Downlink (DL): {result.dlMaplDb.toFixed(1)} dB MAPL</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
            <span>Uplink (UL): {result.ulMaplDb.toFixed(1)} dB MAPL</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>Max Cell Radius: {cellRadiusDisplay}</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400 inline" />
          <span>Formula Engine: 3GPP TS 38.101/104 · SPM Empirical Path Loss</span>
        </div>
      </div>
    </div>
  );
};
