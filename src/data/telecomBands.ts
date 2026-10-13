import { BandInfo } from '../types/telecom';

/**
 * 3GPP Frequency Bands for E-UTRA (4G LTE) and 5G NR
 * Complete specification based on:
 * - 3GPP TS 36.101 (E-UTRA / LTE Frequency Bands)
 * - 3GPP TS 38.101-1 & TS 38.101-2 (5G NR Frequency Bands FR1 & FR2)
 * Reference sources:
 * - https://en.wikipedia.org/wiki/LTE_frequency_bands
 * - https://en.wikipedia.org/wiki/5G_NR_frequency_bands
 */
export const TELECOM_BANDS: BandInfo[] = [
  // =========================================================================
  // 1. 4G LTE E-UTRA BANDS - FREQUENCY DIVISION DUPLEX (FDD)
  // =========================================================================
  {
    band: 'B1',
    name: 'B1 (2100 MHz IMT)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2140,
    ulFreqMHz: 1950,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2100 Core IMT'
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
    band: 'B4',
    name: 'B4 (1700/2100 MHz AWS-1)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2132.5,
    ulFreqMHz: 1732.5,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1700 AWS-1'
  },
  {
    band: 'B5',
    name: 'B5 (850 MHz CLR)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 881.5,
    ulFreqMHz: 836.5,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '850 Cellular CLR'
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
    commonName: '900 Extended GSM'
  },
  {
    band: 'B9',
    name: 'B9 (1800 MHz UMTS Japan)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1862.4,
    ulFreqMHz: 1767.4,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1800 Japan'
  },
  {
    band: 'B10',
    name: 'B10 (1700 MHz Extended AWS)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2140,
    ulFreqMHz: 1740,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: 'Extended AWS'
  },
  {
    band: 'B11',
    name: 'B11 (1500 MHz Lower PDC)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1485.9,
    ulFreqMHz: 1437.9,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1500 Lower PDC (Japan)'
  },
  {
    band: 'B12',
    name: 'B12 (700 MHz Lower SMH)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 737.5,
    ulFreqMHz: 707.5,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '700 Lower SMH'
  },
  {
    band: 'B13',
    name: 'B13 (700 MHz Upper SMH C)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 751,
    ulFreqMHz: 782,
    bandwidthsMHz: [5, 10],
    commonName: '700 Upper SMH (Verizon)'
  },
  {
    band: 'B14',
    name: 'B14 (700 MHz FirstNet)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 763,
    ulFreqMHz: 793,
    bandwidthsMHz: [5, 10],
    commonName: '700 FirstNet Public Safety'
  },
  {
    band: 'B17',
    name: 'B17 (700 MHz Lower SMH B/C)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 740,
    ulFreqMHz: 710,
    bandwidthsMHz: [5, 10],
    commonName: '700 Lower SMH (AT&T)'
  },
  {
    band: 'B18',
    name: 'B18 (850 MHz Lower 800)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 867.5,
    ulFreqMHz: 822.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '850 Lower 800 (Japan)'
  },
  {
    band: 'B19',
    name: 'B19 (850 MHz Upper 800)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 882.5,
    ulFreqMHz: 837.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '850 Upper 800 (Japan)'
  },
  {
    band: 'B20',
    name: 'B20 (800 MHz DD EU)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 806,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800 Digital Dividend'
  },
  {
    band: 'B21',
    name: 'B21 (1500 MHz Upper PDC)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1503.4,
    ulFreqMHz: 1455.4,
    bandwidthsMHz: [5, 10, 15],
    commonName: '1500 Upper PDC (Japan)'
  },
  {
    band: 'B22',
    name: 'B22 (3500 MHz FDD)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 3550,
    ulFreqMHz: 3450,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '3500 FDD'
  },
  {
    band: 'B24',
    name: 'B24 (1600 MHz US L-Band)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1542,
    ulFreqMHz: 1643.5,
    bandwidthsMHz: [5, 10],
    commonName: '1600 US L-Band'
  },
  {
    band: 'B25',
    name: 'B25 (1900 MHz Extended PCS)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1962.5,
    ulFreqMHz: 1882.5,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1900 Extended PCS'
  },
  {
    band: 'B26',
    name: 'B26 (850 MHz Extended CLR)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 876.5,
    ulFreqMHz: 831.5,
    bandwidthsMHz: [1.4, 3, 5, 10, 15],
    commonName: '850 Extended Cellular'
  },
  {
    band: 'B27',
    name: 'B27 (800 MHz SMR)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 860.5,
    ulFreqMHz: 815.5,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '800 SMR'
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
    band: 'B29',
    name: 'B29 (700 MHz Lower SMH SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 722.5,
    ulFreqMHz: 722.5,
    bandwidthsMHz: [3, 5, 10],
    commonName: '700 Lower SMH (SDL)'
  },
  {
    band: 'B30',
    name: 'B30 (2300 MHz WCS)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2355,
    ulFreqMHz: 2310,
    bandwidthsMHz: [5, 10],
    commonName: '2300 WCS'
  },
  {
    band: 'B31',
    name: 'B31 (450 MHz NMT)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 465,
    ulFreqMHz: 455,
    bandwidthsMHz: [1.4, 3, 5],
    commonName: '450 NMT / Private LTE'
  },
  {
    band: 'B32',
    name: 'B32 (1500 MHz L-Band SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1474,
    ulFreqMHz: 1474,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1500 L-Band (SDL)'
  },
  {
    band: 'B65',
    name: 'B65 (2100 MHz Extended IMT)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2155,
    ulFreqMHz: 1965,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2100 Extended IMT'
  },
  {
    band: 'B66',
    name: 'B66 (1700/2100 MHz AWS-3)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2155,
    ulFreqMHz: 1745,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1700/2100 Extended AWS-3'
  },
  {
    band: 'B67',
    name: 'B67 (700 MHz EU SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 748,
    ulFreqMHz: 748,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '700 EU (SDL)'
  },
  {
    band: 'B68',
    name: 'B68 (700 MHz ME/EU)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 768,
    ulFreqMHz: 713,
    bandwidthsMHz: [5, 10, 15],
    commonName: '700 ME/EU'
  },
  {
    band: 'B69',
    name: 'B69 (2600 MHz SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2595,
    ulFreqMHz: 2595,
    bandwidthsMHz: [5],
    commonName: '2600 IMT-E (SDL)'
  },
  {
    band: 'B70',
    name: 'B70 (1700/2000 MHz AWS-4)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 2007.5,
    ulFreqMHz: 1702.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '1700/2000 AWS-4'
  },
  {
    band: 'B71',
    name: 'B71 (600 MHz US Digital Dividend)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 634.5,
    ulFreqMHz: 680.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '600 US Digital Dividend'
  },
  {
    band: 'B72',
    name: 'B72 (450 MHz PMR/PAMR EU)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 463.5,
    ulFreqMHz: 453.5,
    bandwidthsMHz: [1.4, 3, 5],
    commonName: '450 PMR/PAMR (EU)'
  },
  {
    band: 'B73',
    name: 'B73 (450 MHz APAC)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 462.5,
    ulFreqMHz: 452.5,
    bandwidthsMHz: [1.4, 3, 5],
    commonName: '450 APAC'
  },
  {
    band: 'B74',
    name: 'B74 (1500 MHz Lower L-Band)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1496.5,
    ulFreqMHz: 1448.5,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1500 Lower L-Band'
  },
  {
    band: 'B75',
    name: 'B75 (1500 MHz SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 1474.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1500 SDL'
  },
  {
    band: 'B76',
    name: 'B76 (1500 MHz SDL)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 1429.5,
    bandwidthsMHz: [5],
    commonName: '1500 SDL'
  },
  {
    band: 'B85',
    name: 'B85 (700 MHz Extended Lower SMH)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 737,
    ulFreqMHz: 707,
    bandwidthsMHz: [5, 10],
    commonName: '700 Extended Lower SMH'
  },
  {
    band: 'B87',
    name: 'B87 (410 MHz PPDR EU)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 422.5,
    ulFreqMHz: 412.5,
    bandwidthsMHz: [1.4, 3, 5],
    commonName: '410 PPDR (EU)'
  },
  {
    band: 'B88',
    name: 'B88 (410 MHz PPDR EU)',
    duplex: 'FDD',
    tech: '4G',
    dlFreqMHz: 424.5,
    ulFreqMHz: 414.5,
    bandwidthsMHz: [1.4, 3, 5],
    commonName: '410 PPDR (EU)'
  },

  // =========================================================================
  // 2. 4G LTE E-UTRA BANDS - TIME DIVISION DUPLEX (TDD)
  // =========================================================================
  {
    band: 'B33',
    name: 'B33 (2000 MHz IMT TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2017.5,
    ulFreqMHz: 2017.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2000 IMT TDD'
  },
  {
    band: 'B34',
    name: 'B34 (2010 MHz TD-SCDMA Gap)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2017.5,
    ulFreqMHz: 2017.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '2010 TD-SCDMA (China)'
  },
  {
    band: 'B35',
    name: 'B35 (1900 MHz PCS Uplink TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1880,
    ulFreqMHz: 1880,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1900 PCS Uplink TDD'
  },
  {
    band: 'B36',
    name: 'B36 (1900 MHz PCS Downlink TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1960,
    ulFreqMHz: 1960,
    bandwidthsMHz: [1.4, 3, 5, 10, 15, 20],
    commonName: '1900 PCS Downlink TDD'
  },
  {
    band: 'B37',
    name: 'B37 (1900 MHz PCS Duplex Spacing)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1920,
    ulFreqMHz: 1920,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1900 PCS Duplex Spacing'
  },
  {
    band: 'B38',
    name: 'B38 (2600 MHz IMT-E TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2595,
    ulFreqMHz: 2595,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2600 TDD'
  },
  {
    band: 'B39',
    name: 'B39 (1900 MHz DCS-IMT Gap)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1900,
    ulFreqMHz: 1900,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1900 TD-SCDMA (China)'
  },
  {
    band: 'B40',
    name: 'B40 (2300 MHz S-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2350,
    ulFreqMHz: 2350,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2300 TDD'
  },
  {
    band: 'B41',
    name: 'B41 (2500 MHz BRS/EBS TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2593,
    ulFreqMHz: 2593,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2500 BRS/EBS'
  },
  {
    band: 'B42',
    name: 'B42 (3500 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 3500,
    ulFreqMHz: 3500,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '3500 TDD'
  },
  {
    band: 'B43',
    name: 'B43 (3700 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 3700,
    ulFreqMHz: 3700,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '3700 TDD'
  },
  {
    band: 'B44',
    name: 'B44 (700 MHz China TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 753,
    ulFreqMHz: 753,
    bandwidthsMHz: [3, 5, 10, 15, 20],
    commonName: '700 TDD (China)'
  },
  {
    band: 'B45',
    name: 'B45 (1450 MHz China TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1457,
    ulFreqMHz: 1457,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1450 TDD (China)'
  },
  {
    band: 'B46',
    name: 'B46 (5200 MHz LAA Unlicensed)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 5537.5,
    ulFreqMHz: 5537.5,
    bandwidthsMHz: [10, 20],
    commonName: '5.2 GHz LAA Unlicensed'
  },
  {
    band: 'B47',
    name: 'B47 (5900 MHz V2X)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 5890,
    ulFreqMHz: 5890,
    bandwidthsMHz: [10, 20],
    commonName: '5.9 GHz V2X'
  },
  {
    band: 'B48',
    name: 'B48 (3600 MHz CBRS US)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 3625,
    ulFreqMHz: 3625,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '3.5 GHz CBRS (US)'
  },
  {
    band: 'B49',
    name: 'B49 (3600 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 3625,
    ulFreqMHz: 3625,
    bandwidthsMHz: [10, 20],
    commonName: '3.6 GHz TDD'
  },
  {
    band: 'B50',
    name: 'B50 (1500 MHz L-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 1474.5,
    bandwidthsMHz: [3, 5, 10, 15, 20],
    commonName: '1500 L-Band TDD'
  },
  {
    band: 'B51',
    name: 'B51 (1500 MHz L-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 1429.5,
    bandwidthsMHz: [3, 5],
    commonName: '1500 L-Band TDD'
  },
  {
    band: 'B52',
    name: 'B52 (3300 MHz C-Band TDD)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 3350,
    ulFreqMHz: 3350,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '3.3 GHz C-Band TDD'
  },
  {
    band: 'B53',
    name: 'B53 (2500 MHz S-Band Globalstar)',
    duplex: 'TDD',
    tech: '4G',
    dlFreqMHz: 2489.25,
    ulFreqMHz: 2489.25,
    bandwidthsMHz: [1.4, 3, 5, 10],
    commonName: '2.4 GHz Globalstar S-Band'
  },

  // =========================================================================
  // 3. 5G NR FR1 SUB-6 GHz BANDS - FREQUENCY DIVISION DUPLEX (FDD / SDL / SUL)
  // =========================================================================
  {
    band: 'n1',
    name: 'n1 (2100 MHz IMT FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2140,
    ulFreqMHz: 1950,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '2100 Core FDD'
  },
  {
    band: 'n2',
    name: 'n2 (1900 MHz PCS FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1960,
    ulFreqMHz: 1880,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 35, 40],
    commonName: '1900 PCS'
  },
  {
    band: 'n3',
    name: 'n3 (1800 MHz DCS FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1842.5,
    ulFreqMHz: 1747.5,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '1800 DCS FDD'
  },
  {
    band: 'n5',
    name: 'n5 (850 MHz CLR FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 881.5,
    ulFreqMHz: 836.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '850 Cellular CLR'
  },
  {
    band: 'n7',
    name: 'n7 (2600 MHz IMT-E FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2655,
    ulFreqMHz: 2535,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40, 50],
    commonName: '2600 FDD Expansion'
  },
  {
    band: 'n8',
    name: 'n8 (900 MHz E-GSM FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 942.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [5, 10, 15, 20, 35],
    commonName: '900 Extended GSM'
  },
  {
    band: 'n12',
    name: 'n12 (700 MHz Lower SMH FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 737.5,
    ulFreqMHz: 707.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '700 Lower SMH'
  },
  {
    band: 'n13',
    name: 'n13 (700 MHz Upper SMH C FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 751,
    ulFreqMHz: 782,
    bandwidthsMHz: [5, 10],
    commonName: '700 Upper SMH (Verizon)'
  },
  {
    band: 'n14',
    name: 'n14 (700 MHz FirstNet FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 763,
    ulFreqMHz: 793,
    bandwidthsMHz: [5, 10],
    commonName: '700 FirstNet Public Safety'
  },
  {
    band: 'n18',
    name: 'n18 (850 MHz Lower 800 FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 867.5,
    ulFreqMHz: 822.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '850 Lower 800 (Japan)'
  },
  {
    band: 'n20',
    name: 'n20 (800 MHz DD EU FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 806,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800 EU Digital Dividend'
  },
  {
    band: 'n24',
    name: 'n24 (1600 MHz US L-Band FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1542,
    ulFreqMHz: 1643.5,
    bandwidthsMHz: [5, 10],
    commonName: '1600 US L-Band'
  },
  {
    band: 'n25',
    name: 'n25 (1900 MHz Extended PCS FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1962.5,
    ulFreqMHz: 1882.5,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '1900 Extended PCS'
  },
  {
    band: 'n26',
    name: 'n26 (850 MHz Extended CLR FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 876.5,
    ulFreqMHz: 831.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '850 Extended Cellular'
  },
  {
    band: 'n28',
    name: 'n28 (700 MHz APT FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 780.5,
    ulFreqMHz: 725.5,
    bandwidthsMHz: [5, 10, 15, 20, 30],
    commonName: '700 Low-Band Coverage APT'
  },
  {
    band: 'n29',
    name: 'n29 (700 MHz Lower SMH SDL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 722.5,
    ulFreqMHz: 722.5,
    bandwidthsMHz: [5, 10],
    commonName: '700 Lower SMH (SDL)'
  },
  {
    band: 'n30',
    name: 'n30 (2300 MHz WCS FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2355,
    ulFreqMHz: 2310,
    bandwidthsMHz: [5, 10],
    commonName: '2300 WCS FDD'
  },
  {
    band: 'n65',
    name: 'n65 (2100 MHz Extended IMT FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2155,
    ulFreqMHz: 1965,
    bandwidthsMHz: [5, 10, 15, 20, 50],
    commonName: '2100 Extended IMT'
  },
  {
    band: 'n66',
    name: 'n66 (1700/2100 MHz AWS-3 FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2155,
    ulFreqMHz: 1745,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '1700/2100 Extended AWS-3'
  },
  {
    band: 'n70',
    name: 'n70 (1700/2000 MHz AWS-4 FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2007.5,
    ulFreqMHz: 1702.5,
    bandwidthsMHz: [5, 10, 15, 20, 25],
    commonName: '1700/2000 AWS-4'
  },
  {
    band: 'n71',
    name: 'n71 (600 MHz US Digital Dividend)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 634.5,
    ulFreqMHz: 680.5,
    bandwidthsMHz: [5, 10, 15, 20, 35, 40],
    commonName: '600 US Digital Dividend'
  },
  {
    band: 'n74',
    name: 'n74 (1500 MHz Lower L-Band FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1496.5,
    ulFreqMHz: 1448.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '1500 Lower L-Band'
  },
  {
    band: 'n75',
    name: 'n75 (1500 MHz SDL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 1474.5,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40, 50],
    commonName: '1500 SDL'
  },
  {
    band: 'n76',
    name: 'n76 (1500 MHz SDL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 1429.5,
    bandwidthsMHz: [5],
    commonName: '1500 SDL'
  },
  {
    band: 'n80',
    name: 'n80 (1800 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1747.5,
    ulFreqMHz: 1747.5,
    bandwidthsMHz: [5, 10, 15, 20, 25, 30, 40],
    commonName: '1800 SUL (Supplementary Uplink)'
  },
  {
    band: 'n81',
    name: 'n81 (900 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 897.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '900 SUL (Supplementary Uplink)'
  },
  {
    band: 'n82',
    name: 'n82 (800 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 847,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800 SUL (Supplementary Uplink)'
  },
  {
    band: 'n83',
    name: 'n83 (700 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 725.5,
    ulFreqMHz: 725.5,
    bandwidthsMHz: [5, 10, 15, 20, 30],
    commonName: '700 SUL (Supplementary Uplink)'
  },
  {
    band: 'n84',
    name: 'n84 (2100 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1950,
    ulFreqMHz: 1950,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '2100 SUL (Supplementary Uplink)'
  },
  {
    band: 'n86',
    name: 'n86 (1700 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1745,
    ulFreqMHz: 1745,
    bandwidthsMHz: [5, 10, 15, 20, 40],
    commonName: '1700 SUL (Supplementary Uplink)'
  },
  {
    band: 'n89',
    name: 'n89 (850 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 836.5,
    ulFreqMHz: 836.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '850 SUL (Supplementary Uplink)'
  },
  {
    band: 'n91',
    name: 'n91 (800/1400 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10],
    commonName: '800/1400 EU FDD'
  },
  {
    band: 'n92',
    name: 'n92 (800/1500 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 847,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '800/1500 EU FDD'
  },
  {
    band: 'n93',
    name: 'n93 (900/1400 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [5, 10],
    commonName: '900/1400 EU FDD'
  },
  {
    band: 'n94',
    name: 'n94 (900/1500 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 897.5,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '900/1500 EU FDD'
  },
  {
    band: 'n95',
    name: 'n95 (2000 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2017.5,
    ulFreqMHz: 2017.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '2000 SUL (Supplementary Uplink)'
  },
  {
    band: 'n97',
    name: 'n97 (2300 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 2350,
    ulFreqMHz: 2350,
    bandwidthsMHz: [10, 20, 30, 40],
    commonName: '2300 SUL (Supplementary Uplink)'
  },
  {
    band: 'n98',
    name: 'n98 (1900 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1900,
    ulFreqMHz: 1900,
    bandwidthsMHz: [5, 10, 15, 20, 30, 40],
    commonName: '1900 SUL (Supplementary Uplink)'
  },
  {
    band: 'n99',
    name: 'n99 (1600 MHz SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 1643.5,
    ulFreqMHz: 1643.5,
    bandwidthsMHz: [5, 10],
    commonName: '1600 SUL (Supplementary Uplink)'
  },
  {
    band: 'n100',
    name: 'n100 (900 MHz RMR SUL)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 877.2,
    ulFreqMHz: 877.2,
    bandwidthsMHz: [5],
    commonName: '900 RMR SUL'
  },
  {
    band: 'n105',
    name: 'n105 (600 MHz FDD)',
    duplex: 'FDD',
    tech: '5G',
    dlFreqMHz: 632,
    ulFreqMHz: 683,
    bandwidthsMHz: [5, 10, 15, 20],
    commonName: '600 Extended Digital Dividend'
  },

  // =========================================================================
  // 4. 5G NR FR1 SUB-6 GHz BANDS - TIME DIVISION DUPLEX (TDD)
  // =========================================================================
  {
    band: 'n34',
    name: 'n34 (2000 MHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2017.5,
    ulFreqMHz: 2017.5,
    bandwidthsMHz: [5, 10, 15],
    commonName: '2000 TDD'
  },
  {
    band: 'n38',
    name: 'n38 (2600 MHz IMT-E TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2595,
    ulFreqMHz: 2595,
    bandwidthsMHz: [10, 15, 20, 40],
    commonName: '2600 TDD'
  },
  {
    band: 'n39',
    name: 'n39 (1900 MHz DCS-IMT Gap TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 1900,
    ulFreqMHz: 1900,
    bandwidthsMHz: [5, 10, 15, 20, 30, 40],
    commonName: '1900 DCS-IMT Gap TDD'
  },
  {
    band: 'n40',
    name: 'n40 (2300 MHz S-Band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2350,
    ulFreqMHz: 2350,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 80],
    commonName: '2300 TDD'
  },
  {
    band: 'n41',
    name: 'n41 (2500 MHz BRS/EBS TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2593,
    ulFreqMHz: 2593,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 80, 90, 100],
    commonName: '2.5 GHz Mid-band'
  },
  {
    band: 'n46',
    name: 'n46 (5200 MHz NR-U Unlicensed TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 5537.5,
    ulFreqMHz: 5537.5,
    bandwidthsMHz: [10, 20, 40, 60, 80],
    commonName: '5.2 GHz NR-U Unlicensed'
  },
  {
    band: 'n48',
    name: 'n48 (3500 MHz CBRS US TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 3625,
    ulFreqMHz: 3625,
    bandwidthsMHz: [10, 20, 40, 50, 60, 80, 100],
    commonName: '3.5 GHz CBRS (US)'
  },
  {
    band: 'n50',
    name: 'n50 (1500 MHz L-Band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 1474.5,
    ulFreqMHz: 1474.5,
    bandwidthsMHz: [10, 20, 30, 40, 50, 60, 80],
    commonName: '1500 L-Band TDD'
  },
  {
    band: 'n51',
    name: 'n51 (1500 MHz L-Band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 1429.5,
    ulFreqMHz: 1429.5,
    bandwidthsMHz: [5],
    commonName: '1500 L-Band TDD'
  },
  {
    band: 'n53',
    name: 'n53 (2500 MHz S-Band Globalstar TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2489.25,
    ulFreqMHz: 2489.25,
    bandwidthsMHz: [5, 10],
    commonName: '2.4 GHz Globalstar S-Band'
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
    name: 'n79 (4700 MHz High Mid-band TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 4700,
    ulFreqMHz: 4700,
    bandwidthsMHz: [40, 50, 60, 80, 100],
    commonName: '4.7 GHz High Mid-band'
  },
  {
    band: 'n90',
    name: 'n90 (2500 MHz BRS TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 2593,
    ulFreqMHz: 2593,
    bandwidthsMHz: [10, 15, 20, 30, 40, 50, 60, 80, 90, 100],
    commonName: '2.5 GHz BRS TDD'
  },
  {
    band: 'n96',
    name: 'n96 (6000 MHz NR-U 6 GHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 6525,
    ulFreqMHz: 6525,
    bandwidthsMHz: [20, 40, 60, 80, 100],
    commonName: '6 GHz NR-U Unlicensed'
  },
  {
    band: 'n101',
    name: 'n101 (1900 MHz RMR TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 1905,
    ulFreqMHz: 1905,
    bandwidthsMHz: [5, 10],
    commonName: '1900 RMR Railway Mobile Radio'
  },
  {
    band: 'n102',
    name: 'n102 (6000 MHz Lower 6 GHz NR-U TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 6175,
    ulFreqMHz: 6175,
    bandwidthsMHz: [20, 40, 60, 80, 100],
    commonName: 'Lower 6 GHz NR-U'
  },
  {
    band: 'n104',
    name: 'n104 (6700 MHz Upper 6 GHz TDD)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 6775,
    ulFreqMHz: 6775,
    bandwidthsMHz: [20, 40, 60, 80, 100],
    commonName: 'Upper 6 GHz IMT'
  },

  // =========================================================================
  // 5. 5G NR FR2 MILLIMETER-WAVE (mmWave) BANDS - TIME DIVISION DUPLEX (TDD)
  // =========================================================================
  {
    band: 'n257',
    name: 'n257 (28 GHz mmWave LMDS)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 28000,
    ulFreqMHz: 28000,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '28 GHz mmWave LMDS',
    isMmWave: true
  },
  {
    band: 'n258',
    name: 'n258 (26 GHz European mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 26000,
    ulFreqMHz: 26000,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '26 GHz European mmWave',
    isMmWave: true
  },
  {
    band: 'n259',
    name: 'n259 (41 GHz mmWave V-Band)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 41500,
    ulFreqMHz: 41500,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '41 GHz mmWave V-Band',
    isMmWave: true
  },
  {
    band: 'n260',
    name: 'n260 (39 GHz mmWave Ka-Band)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 38500,
    ulFreqMHz: 38500,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '39 GHz mmWave Ka-Band',
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
  },
  {
    band: 'n262',
    name: 'n262 (47 GHz mmWave)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 47700,
    ulFreqMHz: 47700,
    bandwidthsMHz: [50, 100, 200, 400],
    commonName: '47 GHz mmWave',
    isMmWave: true
  },
  {
    band: 'n263',
    name: 'n263 (60 GHz mmWave V-Band NR-U)',
    duplex: 'TDD',
    tech: '5G',
    dlFreqMHz: 64000,
    ulFreqMHz: 64000,
    bandwidthsMHz: [100, 200, 400],
    commonName: '60 GHz mmWave V-Band (NR-U)',
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
  { id: 'LTE_CFG1', label: 'LTE Config 1 (DSUUDDSUUD - 6:4)', dlRatio: 0.60, ulRatio: 0.40, slotPeriodMs: 5.0 },
  { id: 'CUSTOM', label: 'Customized TDD Frame Ratio (User Defined)', dlRatio: 0.75, ulRatio: 0.25, slotPeriodMs: 2.5 }
];

export const MIMO_CONFIGS: Record<string, { dlLayers: number; ulLayers: number; dlBfGainDb: number; ulRxGainDb: number; desc: string }> = {
  'SISO': { dlLayers: 1, ulLayers: 1, dlBfGainDb: 0, ulRxGainDb: 0, desc: 'Single-Input Single-Output' },
  '2x2': { dlLayers: 2, ulLayers: 2, dlBfGainDb: 0, ulRxGainDb: 3.0, desc: '2T2R Conventional Cross-Pol' },
  '4x4': { dlLayers: 4, ulLayers: 4, dlBfGainDb: 3.0, ulRxGainDb: 6.0, desc: '4T4R Spatial Multiplexing' },
  '8x8': { dlLayers: 4, ulLayers: 4, dlBfGainDb: 6.0, ulRxGainDb: 7.5, desc: '8T8R Sectorized / Multi-layer' },
  '16TR': { dlLayers: 4, ulLayers: 4, dlBfGainDb: 6.0, ulRxGainDb: 8.0, desc: '16TR Lightweight Massive MIMO' },
  '32TR': { dlLayers: 4, ulLayers: 4, dlBfGainDb: 9.0, ulRxGainDb: 10.5, desc: '32TR Massive MIMO AAU' },
  '64TR': { dlLayers: 4, ulLayers: 4, dlBfGainDb: 12.0, ulRxGainDb: 12.5, desc: '64TR High-Density Massive MIMO AAU (Full 3D Beamforming)' }
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
