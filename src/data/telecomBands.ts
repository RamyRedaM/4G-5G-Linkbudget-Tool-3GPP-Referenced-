import { BandInfo, DuplexMode } from '../types/telecom';

/**
 * 3GPP Frequency Bands for E-UTRA (4G LTE) and 5G NR
 * Based on 3GPP TS 36.101 & TS 38.101-1 / TS 38.101-2
 */
export const TELECOM_BANDS: BandInfo[] = [
  // --- 4G LTE EUTRA Bands ---
  {
    band: 'B1',
    name: 'B1 (2100 MHz)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2140,
    ulFreqMHz: 1950,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2100 Core'
  },
  {
    band: 'B2',
    name: 'B2 (1900 MHz PCS)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1960,
    ulFreqMHz: 1880,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1900 PCS'
  },
  {
    band: 'B3',
    name: 'B3 (1800 MHz DCS)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1842.5,
    ulFreqMHz: 1747.5,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1800 DCS'
  },
  {
    band: 'B5',
    name: 'B5 (850 MHz CLR)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 881.5,
    ulFreqMHz: 836.5,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '850 Cellular'
  },
  {
    band: 'B7',
    name: 'B7 (2600 MHz IMT-E)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2655,
    ulFreqMHz: 2535,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2600 Expansion'
  },
  {
    band: 'B8',
    name: 'B8 (900 MHz E-GSM)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 942.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '900 GSM'
  },
  {
    band: 'B20',
    name: 'B20 (800 MHz DD)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 806,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800 Digital Dividend'
  },
  {
    band: 'B28',
    name: 'B28 (700 MHz APT)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 780.5,
    ulFreqMHz: 725.5,
    bandwidthsMHz: [3, 5, 10, 15, 20],
    commonName: '700 APT'
  },
  {
    band: 'B38',
    name: 'B38 (2600 MHz TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2595,
    ulFreqMHz: 2595,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2600 TDD'
  },
  {
    band: 'B40',
    name: 'B40 (2300 MHz TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2350,
    ulFreqMHz: 2350,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2300 TDD'
  },
  {
    band: 'B41',
    name: 'B41 (2500 MHz BRS/EBS)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2593,
    ulFreqMHz: 2593,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2500 BRS/EBS'
  },

  // --- 5G NR FR1 Sub-6GHz Bands ---
  {
    band: 'n1',
    name: 'n1 (2100 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2140,
    ulFreqMHz: 1950,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '2100 FDD'
  },
  {
    band: 'n3',
    name: 'n3 (1800 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1842.5,
    ulFreqMHz: 1747.5,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '1800 FDD'
  },
  {
    band: 'n7',
    name: 'n7 (2600 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2655,
    ulFreqMHz: 2535,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40, 50],
    commonName: '2600 FDD'
  },
  {
    band: 'n8',
    name: 'n8 (900 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 942.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '900 FDD'
  },
  {
    band: 'n20',
    name: 'n20 (800 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 806,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800 FDD'
  },
  {
    band: 'n28',
    name: 'n28 (700 MHz FDD APT)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 780.5,
    ulFreqMHz: 725.5,
    bandwidthsMHz: [5, 10, 15, 20, 30],
    commonName: '700 Low-band Coverage'
  },
  {
    band: 'n38',
    name: 'n38 (2600 MHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2595,
    ulFreqMHz: 2595,
    bandwidthsMHz: [10, 15, 20, 40],
    commonName: '2600 TDD'
  },
  {
    band: 'n40',
    name: 'n40 (2300 MHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2350,
    ulFreqMHz: 2350,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 80],
    commonName: '2300 TDD'
  },
  {
    band: 'n41',
    name: 'n41 (2500 MHz TDD BRS)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2593,
    ulFreqMHz: 2593,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 80, 90, 100],
    commonName: '2.5 GHz Mid-band'
  },
  {
    band: 'n77',
    name: 'n77 (3700 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 3700,
    ulFreqMHz: 3700,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    commonName: '3.7 GHz US C-Band'
  },
  {
    band: 'n78',
    name: 'n78 (3500 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 3500,
    ulFreqMHz: 3500,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    commonName: '3.5 GHz Golden Band'
  },
  {
    band: 'n79',
    name: 'n79 (4700 MHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 4700,
    ulFreqMHz: 4700,
    bandwidthsMHz: [40, 50, 60, 80, 100],
    commonName: '4.7 GHz High Mid-band'
  },

  // --- 5G NR FR2 mmWave Bands ---
  {
    band: 'n257',
    name: 'n257 (28 GHz mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 28000,
    ulFreqMHz: 28000,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '28 GHz mmWave',
    isMmWave: true
  },
  {
    band: 'n258',
    name: 'n258 (26 GHz mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 26000,
    ulFreqMHz: 26000,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '26 GHz European mmWave',
    isMmWave: true
  },
  {
    band: 'n260',
    name: 'n260 (39 GHz mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 39000,
    ulFreqMHz: 39000,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '39 GHz mmWave',
    isMmWave: true
  },
  {
    band: 'n261',
    name: 'n261 (28 GHz US mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 27925,
    ulFreqMHz: 27925,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '28 GHz US mmWave',
    isMmWave: true
  }
];

export const TDD_FRAME_PATTERNS = [
  { id: 'DDDSU', label: 'DDDSU (4:1 DL-Heavy ~80% DL / 20% UL)', dlRatio: 0.77, ulRatio: 0.18, slotPeriodMs: 2.5 },
  { id: '8_2', label: '8:2 (4:1 Ratio 2.5ms Slot Period)', dlRatio: 0.78, ulRatio: 0.17, slotPeriodMs: 2.5 },
  { id: '7_3', label: '7:3 (Balanced High Capacity)', dlRatio: 0.68, ulRatio: 0.27, slotPeriodMs: 5.0 },
  { id: 'DDSUU', label: 'DDSUU (3:2 Balanced DL/UL)', dlRatio: 0.58, ulRatio: 0.38, slotPeriodMs: 2.5 },
  { id: 'DSUUU', label: 'DSUUU (1:3 UL Heavy for Surveillance/Live Broadcast)', dlRatio: 0.22, ulRatio: 0.74, slotPeriodMs: 2.5 },
  { id: 'LTE_CFG2', label: 'LTE Config 2 (DSUDDDSUDD - 8:2)', dlRatio: 0.80, ulRatio: 0.20, slotPeriodMs: 5.0 },
  { id: 'LTE_CFG1', label: 'LTE Config 1 (DSUUDDSUUD - 6:4)', dlRatio: 0.60, ulRatio: 0.40, slotPeriodMs: 5.0 }
];

export const MIMO_CONFIGS: Record<string, { dlLayers: number; ulLayers: number; dlBfGainDb: number; ulRxGainDb: number; desc: string }> = {
  'SISO': { dlLayers: 1, ulLayers: 1, dlBfGainDb: 0, ulRxGainDb: 0, desc: 'Single-Input Single-Output' },
  '2x2': { dlLayers: 2, ulLayers: 1, dlBfGainDb: 0, ulRxGainDb: 3.0, desc: '2T2R Conventional Cross-Pol' },
  '4x4': { dlLayers: 4, ulLayers: 2, dlBfGainDb: 3.0, ulRxGainDb: 6.0, desc: '4T4R Spatial Multiplexing' },
  '8x8': { dlLayers: 4, ulLayers: 2, dlBfGainDb: 6.0, ulRxGainDb: 7.5, desc: '8T8R Sectorized / Multi-layer' },
  '16TR': { dlLayers: 4, ulLayers: 2, dlBfGainDb: 6.0, ulRxGainDb: 8.0, desc: '16TR Lightweight Massive MIMO' },
  '32TR': { dlLayers: 4, ulLayers: 2, dlBfGainDb: 9.0, ulRxGainDb: 10.5, desc: '32TR Massive MIMO AAU' },
  '64TR': { dlLayers: 4, ulLayers: 2, dlBfGainDb: 12.0, ulRxGainDb: 12.5, desc: '64TR High-Density Massive MIMO AAU (Full 3D Beamforming)' }
};

export const POPULAR_CA_COMBOS = [
  { id: 'CA_n78A-n28A', name: '5G NR: n78 (100MHz) + n28 (20MHz) [Capacity + Coverage]', tech: '5G', bands: ['n78', 'n28'], bws: [100, 20] },
  { id: 'CA_n77C', name: '5G NR: n77 (100MHz + 100MHz Intraband Contiguous 2CC)', tech: '5G', bands: ['n77', 'n77'], bws: [100, 100] },
  { id: 'CA_n41A-n78A', name: '5G NR: n41 (80MHz) + n78 (100MHz) [Dual Mid-band]', tech: '5G', bands: ['n41', 'n78'], bws: [80, 100] },
  { id: 'CA_n1A-n3A-n78A', name: '5G NR: n1 (20MHz) + n3 (20MHz) + n78 (100MHz) [3CC]', tech: '5G', bands: ['n1', 'n3', 'n78'], bws: [20, 20, 100] },
  { id: 'CA_3A-7A-20A', name: '4G LTE: B3 (20MHz) + B7 (20MHz) + B20 (10MHz) [Classic European 3CC]', tech: '4G', bands: ['B3', 'B7', 'B20'], bws: [20, 20, 10] },
  { id: 'CA_1A-3A-7A', name: '4G LTE: B1 (20MHz) + B3 (20MHz) + B7 (20MHz) [High Capacity 3CC 60MHz]', tech: '4G', bands: ['B1', 'B3', 'B7'], bws: [20, 20, 20] },
  { id: 'CA_n258B', name: '5G mmWave: n258 (400MHz + 400MHz Intraband 800MHz 2CC)', tech: '5G', bands: ['n258', 'n258'], bws: [400, 400] }
];
