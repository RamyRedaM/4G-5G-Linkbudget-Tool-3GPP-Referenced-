import React, { useState } from 'react';
import {
  LinkBudgetInputs,
  TechnologyType,
  DuplexMode,
  MimoMode,
  UeType,
  PropagationModelType,
  EnvironmentClutter,
  IndoorOutdoorScenario
} from '../types/telecom';
import { TELECOM_BANDS, TDD_FRAME_PATTERNS, POPULAR_CA_COMBOS } from '../data/telecomBands';
import {
  Radio,
  Sliders,
  Layers,
  Smartphone,
  Trees,
  Settings2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from 'lucide-react';

interface InputPanelProps {
  inputs: LinkBudgetInputs;
  onChange: (inputs: LinkBudgetInputs) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ inputs, onChange }) => {
  const [activeSection, setActiveSection] = useState<'tech' | 'bs' | 'ue' | 'spm' | 'ca'>('tech');

  const update = (partial: Partial<LinkBudgetInputs>) => {
    onChange({ ...inputs, ...partial });
  };

  // Filter bands according to selected technology and duplex mode
  const availableBands = TELECOM_BANDS.filter(b => {
    if (inputs.technology === '4G') {
      return b.tech === '4G' || b.tech === 'BOTH';
    } else {
      return b.tech === '5G' || b.tech === 'BOTH';
    }
  }).filter(b => b.duplex === inputs.duplexMode);

  const selectedBandInfo = TELECOM_BANDS.find(b => b.band === inputs.band) || availableBands[0] || TELECOM_BANDS[0];

  const handleTechChange = (tech: TechnologyType) => {
    // If switching to 4G, select a valid 4G band
    const validBand = TELECOM_BANDS.find(b => {
      const matchTech = tech === '4G' ? (b.tech === '4G' || b.tech === 'BOTH') : (b.tech === '5G' || b.tech === 'BOTH');
      return matchTech && b.duplex === inputs.duplexMode;
    }) || (tech === '4G' ? TELECOM_BANDS[0] : TELECOM_BANDS.find(b => b.band === 'n78')!);

    const validBw = validBand.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : validBand.bandwidthsMHz[validBand.bandwidthsMHz.length - 1];

    update({
      technology: tech,
      band: validBand.band,
      bandwidthMHz: validBw
    });
  };

  const handleDuplexChange = (duplex: DuplexMode) => {
    const validBand = TELECOM_BANDS.find(b => {
      const matchTech = inputs.technology === '4G' ? (b.tech === '4G' || b.tech === 'BOTH') : (b.tech === '5G' || b.tech === 'BOTH');
      return matchTech && b.duplex === duplex;
    }) || TELECOM_BANDS.find(b => b.duplex === duplex)!;

    const validBw = validBand.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : validBand.bandwidthsMHz[validBand.bandwidthsMHz.length - 1];

    update({
      duplexMode: duplex,
      band: validBand.band,
      bandwidthMHz: validBw
    });
  };

  const handleBandChange = (bandName: string) => {
    const b = TELECOM_BANDS.find(item => item.band === bandName);
    if (!b) return;
    const validBw = b.bandwidthsMHz.includes(inputs.bandwidthMHz)
      ? inputs.bandwidthMHz
      : b.bandwidthsMHz[b.bandwidthsMHz.length - 1];

    update({
      band: bandName,
      duplexMode: b.duplex,
      bandwidthMHz: validBw
    });
  };

  const handleUeTypeChange = (ueType: UeType) => {
    let power = 23;
    let gain = 0;
    let bodyLoss = 3;
    let nf = 8;
    let height = 1.5;

    switch (ueType) {
      case 'HANDSET_STD':
        power = 23; gain = 0; bodyLoss = 3; nf = 8; height = 1.5;
        break;
      case 'HANDSET_HPUE':
        power = 26; gain = 0; bodyLoss = 3; nf = 8; height = 1.5;
        break;
      case 'INDOOR_CPE':
        power = 26; gain = 4; bodyLoss = 0; nf = 6.5; height = 2.0;
        break;
      case 'OUTDOOR_CPE':
        power = 27; gain = 9; bodyLoss = 0; nf = 5.5; height = 6.0;
        break;
    }

    update({
      ueType,
      ueTxPowerDbm: power,
      ueAntennaGainDbi: gain,
      bodyLossDb: bodyLoss,
      ueNoiseFigureDb: nf,
      ueHeightMeters: height
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Tab Navigation for Input Groups */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-lg mb-5 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSection('tech')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'tech'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>1. Technology & Band</span>
        </button>

        <button
          onClick={() => setActiveSection('bs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'bs'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Base Station (gNB/eNB)</span>
        </button>

        <button
          onClick={() => setActiveSection('ue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ue'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>3. UE / Terminal & CPE</span>
        </button>

        <button
          onClick={() => setActiveSection('spm')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'spm'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trees className="w-3.5 h-3.5" />
          <span>4. SPM & Environment</span>
        </button>

        <button
          onClick={() => setActiveSection('ca')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeSection === 'ca'
              ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>5. Carrier Aggregation (CA)</span>
          {inputs.caEnabled && (
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          )}
        </button>
      </div>

      {/* SECTION 1: TECHNOLOGY, DUPLEXING & BAND */}
      {activeSection === 'tech' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Technology selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Technology Standard
              </label>
              <select
                value={inputs.technology}
                onChange={(e) => handleTechChange(e.target.value as TechnologyType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="5G_SA">5G NR Standalone (SA) - Rel 16/17</option>
                <option value="5G_NSA">5G NR Non-Standalone (NSA - Option 3x)</option>
                <option value="4G">4G LTE / LTE-Advanced - Rel 8-15</option>
              </select>
            </div>

            {/* Duplexing Mode */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Duplexing Mode
              </label>
              <select
                value={inputs.duplexMode}
                onChange={(e) => handleDuplexChange(e.target.value as DuplexMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="TDD">TDD (Time Division Duplex)</option>
                <option value="FDD">FDD (Frequency Division Duplex)</option>
              </select>
            </div>

            {/* Band selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                3GPP Operating Band
              </label>
              <select
                value={inputs.band}
                onChange={(e) => handleBandChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                {availableBands.map((b) => (
                  <option key={b.band} value={b.band}>
                    {b.name} - {b.commonName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {/* Bandwidth as per 3GPP */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Channel Bandwidth (3GPP)
              </label>
              <select
                value={inputs.bandwidthMHz}
                onChange={(e) => update({ bandwidthMHz: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                {selectedBandInfo.bandwidthsMHz.map((bw) => (
                  <option key={bw} value={bw}>
                    {bw} MHz
                  </option>
                ))}
              </select>
            </div>

            {/* Max Modulation Enabled: 256QAM or 64QAM */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Max. DL Modulation
              </label>
              <select
                value={inputs.maxDlModulation || '256QAM'}
                onChange={(e) => update({ maxDlModulation: e.target.value as '256QAM' | '64QAM' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="256QAM">256QAM Enabled (Peak)</option>
                <option value="64QAM">64QAM Capped</option>
              </select>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {inputs.maxDlModulation === '64QAM' ? 'Capped at 64QAM' : '256QAM enabled for high SINR'}
              </span>
            </div>

            {/* TDD Frame Ratio (if TDD) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                TDD Frame Ratio / Slot Pattern
              </label>
              <select
                disabled={inputs.duplexMode === 'FDD'}
                value={inputs.tddFrameRatio}
                onChange={(e) => update({ tddFrameRatio: e.target.value })}
                className={`w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none ${
                  inputs.duplexMode === 'FDD' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {TDD_FRAME_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {inputs.duplexMode === 'FDD' && (
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  * FDD has 100% paired spectrum
                </span>
              )}
            </div>

            {/* Carrier Information Info Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono">
              <div className="text-slate-400 mb-1">Carrier RF Center:</div>
              <div className="text-slate-200">
                DL: <span className="text-cyan-400 font-semibold">{selectedBandInfo.dlFreqMHz} MHz</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                UL: <span className="text-emerald-400 font-semibold">{selectedBandInfo.ulFreqMHz} MHz</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BASE STATION (eNodeB / gNodeB) */}
      {activeSection === 'bs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DL Cell TX Power Max */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  DL Cell Max TX Power
                </label>
                <span className="text-xs font-mono font-semibold text-cyan-400">
                  {inputs.bsTxPowerDbm} dBm ({Math.round(Math.pow(10, (inputs.bsTxPowerDbm - 30) / 10))} W)
                </span>
              </div>
              <input
                type="range"
                min="38"
                max="56"
                step="0.5"
                value={inputs.bsTxPowerDbm}
                onChange={(e) => update({ bsTxPowerDbm: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>38 dBm (6.3W)</span>
                <span>46 dBm (40W)</span>
                <span>53 dBm (200W)</span>
                <span>56 dBm (400W)</span>
              </div>
            </div>

            {/* BS Antenna Gain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  BS Antenna Gain
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsAntennaGainDbi} dBi
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="28"
                step="0.5"
                value={inputs.bsAntennaGainDbi}
                onChange={(e) => update({ bsAntennaGainDbi: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>12 dBi (Micro)</span>
                <span>18 dBi (Macro)</span>
                <span>24.5 dBi (Massive MIMO AAU)</span>
              </div>
            </div>

            {/* Feeder & Cable Losses */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Feeder / Cable Loss
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsFeederCableLossDb} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.1"
                value={inputs.bsFeederCableLossDb}
                onChange={(e) => update({ bsFeederCableLossDb: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.0 dB (AAU/integrated)</span>
                <span>0.5 dB (RRU jumper)</span>
                <span>2.5 dB (Long Feeder)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* MIMO Mode of Operation */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                MIMO Mode of Operation
              </label>
              <select
                value={inputs.mimoMode}
                onChange={(e) => update({ mimoMode: e.target.value as MimoMode })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="SISO">SISO (1x1 Single-Input Single-Output)</option>
                <option value="2x2">2x2 (2T2R Conventional Cross-Pol)</option>
                <option value="4x4">4x4 (4T4R Spatial Multiplexing)</option>
                <option value="8x8">8x8 (8T8R Sectorized / 4-Layer)</option>
                <option value="16TR">16TR (16T16R Lightweight Massive MIMO)</option>
                <option value="32TR">32TR (32T32R Massive MIMO AAU)</option>
                <option value="64TR">64TR (64T64R High-Density 3D Beamforming)</option>
              </select>
            </div>

            {/* Base Station Antenna Height */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  BS Antenna Height (h_b)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bsHeightMeters} meters
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={inputs.bsHeightMeters}
                onChange={(e) => update({ bsHeightMeters: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10m (Street)</span>
                <span>30m (Rooftop)</span>
                <span>60m (Tower)</span>
              </div>
            </div>

            {/* Reference Signal Power (RS/SSB EPRE) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-2.5 text-xs font-mono">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Reference Signal (RS/SSB) PWR</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.rsPowerAuto}
                    onChange={(e) => update({ rsPowerAuto: e.target.checked })}
                    className="accent-cyan-400"
                  />
                  <span className="text-[11px] text-cyan-400">Auto 3GPP</span>
                </label>
              </div>
              {inputs.rsPowerAuto ? (
                <div className="text-[11px] text-slate-400 mt-1">
                  Derived from: <code className="text-cyan-300">P_total - 10*log10(N_RE)</code>
                  <div className="mt-1 flex items-center gap-2">
                    <span>RS Boost:</span>
                    <select
                      value={inputs.rsPowerBoostDb}
                      onChange={(e) => update({ rsPowerBoostDb: Number(e.target.value) })}
                      className="bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-slate-200"
                    >
                      <option value="0">0 dB (Normal)</option>
                      <option value="1.77">+1.77 dB (Boosted)</option>
                      <option value="3">+3.0 dB (Max PBCH)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="text-[11px] text-slate-400 block mb-1">Manual RS Override (dBm/RE):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.rsPowerDbmOverride ?? 15}
                    onChange={(e) => update({ rsPowerDbmOverride: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: USER EQUIPMENT & CPE */}
      {activeSection === 'ue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UE Type */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                UE Terminal Type
              </label>
              <select
                value={inputs.ueType}
                onChange={(e) => handleUeTypeChange(e.target.value as UeType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="HANDSET_STD">Standard Handset (Power Class 3 - 23 dBm)</option>
                <option value="HANDSET_HPUE">High-Power UE (HPUE Class 2 - 26 dBm)</option>
                <option value="INDOOR_CPE">Indoor FWA CPE (26 dBm, 4 dBi Gain)</option>
                <option value="OUTDOOR_CPE">Outdoor Rooftop CPE (27-30 dBm, 9 dBi Gain)</option>
              </select>
            </div>

            {/* Max UE TX Power */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Max TX Power
                </label>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {inputs.ueTxPowerDbm} dBm ({Math.round(Math.pow(10, (inputs.ueTxPowerDbm - 30) / 10) * 1000)} mW)
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="30"
                step="0.5"
                value={inputs.ueTxPowerDbm}
                onChange={(e) => update({ ueTxPowerDbm: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>20 dBm (Class 4)</span>
                <span>23 dBm (Class 3 std)</span>
                <span>26 dBm (HPUE)</span>
                <span>27-30 dBm (CPE)</span>
              </div>
            </div>

            {/* UE Antenna Gain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Antenna Gain
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueAntennaGainDbi} dBi
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={inputs.ueAntennaGainDbi}
                onChange={(e) => update({ ueAntennaGainDbi: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 dBi (Phone)</span>
                <span>4 dBi (Indoor CPE)</span>
                <span>9-12 dBi (Outdoor High Gain)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* UE Height */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Antenna Height (h_m)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueHeightMeters} meters
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={inputs.ueHeightMeters}
                onChange={(e) => update({ ueHeightMeters: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1.5m (Handset)</span>
                <span>5m (2nd Floor)</span>
                <span>10m+ (Rooftop CPE)</span>
              </div>
            </div>

            {/* Body Loss */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Body Loss (Hand / Head)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.bodyLossDb} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={inputs.bodyLossDb}
                onChange={(e) => update({ bodyLossDb: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.0 dB (CPE / Free space)</span>
                <span>3.0 dB (Handset standard)</span>
                <span>5.0 dB (Heavy absorption)</span>
              </div>
            </div>

            {/* UE Noise Figure */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  UE Noise Figure (NF)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {inputs.ueNoiseFigureDb} dB
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="10"
                step="0.5"
                value={inputs.ueNoiseFigureDb}
                onChange={(e) => update({ ueNoiseFigureDb: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5.0 dB (High-end CPE)</span>
                <span>7.5 - 8.0 dB (3GPP Handset)</span>
                <span>9.0 dB (Budget UE)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SPM PROPAGATION & ENVIRONMENT */}
      {activeSection === 'spm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Propagation Model */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Propagation Model
              </label>
              <select
                value={inputs.propagationModel}
                onChange={(e) => update({ propagationModel: e.target.value as PropagationModelType })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="SPM">SPM (Standard Propagation Model - Calibrated)</option>
                <option value="3GPP_UMA">3GPP TR 38.901 Urban Macro (UMa)</option>
                <option value="3GPP_UMI">3GPP TR 38.901 Urban Micro (UMi Street Canyon)</option>
                <option value="3GPP_RMA">3GPP TR 38.901 Rural Macro (RMa)</option>
                <option value="COST231_HATA">Cost-231 Hata Model (Sub-2.6GHz)</option>
                <option value="FSPL">Free Space Path Loss (FSPL Benchmark)</option>
              </select>
            </div>

            {/* Clutter Environment */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Morphology / Clutter Environment
              </label>
              <select
                value={inputs.environmentClutter}
                onChange={(e) => update({ environmentClutter: e.target.value as EnvironmentClutter })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="DENSE_URBAN">Dense Urban (High-rise, high obstruction)</option>
                <option value="URBAN">Urban (Medium density commercial/residential)</option>
                <option value="SUBURBAN">Sub-Urban (Low-rise, open streets)</option>
                <option value="RURAL">Rural / Open Terrain (Unobstructed farmland)</option>
              </select>
            </div>

            {/* Indoor / Outdoor Planning Scenario */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Site Planning Scenario (Penetration)
              </label>
              <select
                value={inputs.indoorOutdoorScenario}
                onChange={(e) => update({ indoorOutdoorScenario: e.target.value as IndoorOutdoorScenario })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="OUTDOOR_LOS">Pure Outdoor LOS (0 dB Penetration)</option>
                <option value="OUTDOOR_NLOS">Pure Outdoor NLOS (Clutter Shadowing)</option>
                <option value="IN_VEHICLE">In-Vehicle Penetration (~8-10 dB)</option>
                <option value="INDOOR_STANDARD">Indoor Standard Glass/Plaster (~12-16 dB)</option>
                <option value="INDOOR_DEEP">Deep Indoor / Low-E Glass & Concrete (~22-28 dB)</option>
              </select>
            </div>
          </div>

          {/* Log-Normal Shadow Fading & Margins Panel */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div>
                <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 font-mono">
                  <span>LOG-NORMAL SHADOW FADING (SPM STATISTICAL VARIATION)</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Models large-scale slow fading due to building blockage, terrain obstacles, and clutter variations.
                </p>
              </div>

              {/* Real-time computed Shadow Fading Margin Badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-cyan-800/60 rounded text-xs font-mono">
                <span className="text-slate-400">Calculated Margin M_SF:</span>
                <span className="text-cyan-300 font-bold">
                  +{((inputs.coverageProbability >= 98 ? 2.05 : inputs.coverageProbability >= 95 ? 1.64 : inputs.coverageProbability >= 90 ? 1.28 : 0.84) * inputs.shadowFadingStdDevDb).toFixed(1)} dB
                </span>
                <span className="text-[10px] text-slate-500">
                  (z={inputs.coverageProbability >= 98 ? '2.05' : inputs.coverageProbability >= 95 ? '1.64' : inputs.coverageProbability >= 90 ? '1.28' : '0.84'} · σ={inputs.shadowFadingStdDevDb}dB)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Shadow Fading Standard Deviation (sigma) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                    Standard Deviation (σ_SF, sigma)
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {inputs.shadowFadingStdDevDb.toFixed(1)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  step="0.1"
                  value={inputs.shadowFadingStdDevDb}
                  onChange={(e) => update({ shadowFadingStdDevDb: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                {/* Standard presets for sigma */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: '4.0 dB (LOS)', val: 4.0 },
                    { label: '6.0 dB (Rural)', val: 6.0 },
                    { label: '8.0 dB (Macro)', val: 8.0 },
                    { label: '10.0 dB (Dense)', val: 10.0 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => update({ shadowFadingStdDevDb: preset.val })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        Math.abs(inputs.shadowFadingStdDevDb - preset.val) < 0.05
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coverage Probability */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Target Edge Coverage Probability (P_cov)
                  </label>
                  <span className="text-xs font-mono font-semibold text-cyan-400">
                    {inputs.coverageProbability}%
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="98"
                  step="1"
                  value={inputs.coverageProbability}
                  onChange={(e) => update({ coverageProbability: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>80% (z=0.84)</span>
                  <span>90% (z=1.28)</span>
                  <span>95% (z=1.64)</span>
                  <span>98% (z=2.05)</span>
                </div>
              </div>

              {/* Interference & IoT Margin */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Interference Margin (DL / UL IoT)
                  </label>
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    DL {inputs.interferenceMarginDb} dB / UL {inputs.iotMarginDb} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={inputs.interferenceMarginDb}
                  onChange={(e) => update({ interferenceMarginDb: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0 dB (Isolated)</span>
                  <span>3.0 dB (50% Traffic)</span>
                  <span>5.0 dB (High Load)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: CARRIER AGGREGATION (CA) */}
      {activeSection === 'ca' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-md">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>3GPP Carrier Aggregation (CA) Mode</span>
                {inputs.caEnabled ? (
                  <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    ENABLED
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800">
                    DISABLED (Single CC)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aggregate contiguous or non-contiguous carriers across 3GPP FDD / TDD spectrum.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inputs.caEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  update({
                    caEnabled: enabled,
                    caCarriersCount: enabled ? Math.max(2, inputs.carriers.length) : 1
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {inputs.caEnabled && (
            <div className="space-y-3">
              {/* Preset Combos */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Popular 3GPP Verified CA Combination
                </label>
                <select
                  aria-label="Popular 3GPP Verified CA Combination"
                  onChange={(e) => {
                    const combo = POPULAR_CA_COMBOS.find(c => c.id === e.target.value);
                    if (combo) {
                      const newCarriers = combo.bands.map((bName, i) => {
                        const bandObj = TELECOM_BANDS.find(b => b.band === bName) || TELECOM_BANDS[0];
                        return {
                          id: `cc_${i + 1}`,
                          band: bName,
                          bandwidthMHz: combo.bws[i],
                          freqMHz: bandObj.dlFreqMHz,
                          mimo: inputs.mimoMode,
                          txPowerDbm: inputs.bsTxPowerDbm,
                          isPrimary: i === 0
                        };
                      });
                      update({
                        band: combo.bands[0],
                        bandwidthMHz: combo.bws[0],
                        carriers: newCarriers,
                        caCarriersCount: newCarriers.length
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Select standard 3GPP CA combination...</option>
                  {POPULAR_CA_COMBOS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carrier list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Aggregated Component Carriers ({inputs.carriers.length} CC)</span>
                  <button
                    onClick={() => {
                      if (inputs.carriers.length >= 5) return;
                      const nextBand = TELECOM_BANDS[inputs.carriers.length % TELECOM_BANDS.length];
                      const newC = {
                        id: `cc_${Date.now()}`,
                        band: nextBand.band,
                        bandwidthMHz: nextBand.bandwidthsMHz[0],
                        freqMHz: nextBand.dlFreqMHz,
                        mimo: '4x4' as MimoMode,
                        txPowerDbm: 49,
                        isPrimary: false
                      };
                      update({
                        carriers: [...inputs.carriers, newC],
                        caCarriersCount: inputs.carriers.length + 1
                      });
                    }}
                    disabled={inputs.carriers.length >= 5}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Carrier (Max 5CC)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {inputs.carriers.map((c, idx) => {
                    const bObj = TELECOM_BANDS.find(b => b.band === c.band) || TELECOM_BANDS[0];
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-md text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            idx === 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx === 0 ? 'Pcell (Primary)' : `Scell ${idx} (Secondary)`}
                          </span>
                          <span className="text-slate-100 font-semibold">{c.band}</span>
                          <span className="text-slate-400">({bObj.dlFreqMHz} MHz)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">BW:</span>
                            <select
                              value={c.bandwidthMHz}
                              onChange={(e) => {
                                const newBw = Number(e.target.value);
                                const updated = inputs.carriers.map((item, i) =>
                                  i === idx ? { ...item, bandwidthMHz: newBw } : item
                                );
                                update({ carriers: updated });
                              }}
                              className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-100 text-xs"
                            >
                              {bObj.bandwidthsMHz.map(bw => (
                                <option key={bw} value={bw}>{bw} MHz</option>
                              ))}
                            </select>
                          </div>

                          {idx > 0 && (
                            <button
                              onClick={() => {
                                const filtered = inputs.carriers.filter((_, i) => i !== idx);
                                update({
                                  carriers: filtered,
                                  caCarriersCount: filtered.length
                                });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove Component Carrier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
