import React from 'react';
import { X, BookOpen, CheckCircle, ExternalLink, Zap } from 'lucide-react';

interface TelecomGuruGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelecomGuruGuide: React.FC<TelecomGuruGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100 font-mono">
              TELECOM GURU // 3GPP LINK BUDGET SPECIFICATIONS & SPM MANUAL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 font-sans leading-relaxed">
          {/* Section 1: Standard Propagation Model (SPM) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-cyan-300 font-mono mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              1. Standard Propagation Model (SPM) Formulation
            </h3>
            <p className="text-slate-300 mb-2">
              The Standard Propagation Model (SPM) is the standard empirical model used by RF planning suites (Atoll, Asset, Planet) based on modified Cost-231 Hata:
            </p>
            <div className="bg-slate-900 p-3 rounded border border-slate-800 font-mono text-cyan-300 text-[11px] overflow-x-auto">
              PL(d) = K₁ + K₂ · log₁₀(d) + K₃ · log₁₀(h_BS) + K₄ · Diffraction + K₅ · log₁₀(d) · log₁₀(h_BS) + K₆ · h_UE + K_clutter
            </div>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 font-mono text-[11px]">
              <li><strong>K₁:</strong> Constant offset calibrated to frequency (144.2 + 25.5·log₁₀(f_GHz))</li>
              <li><strong>K₂:</strong> Distance slope exponent (typically 44.9 - 6.55·log₁₀(h_BS))</li>
              <li><strong>K₃:</strong> Antenna height factor (-13.82)</li>
              <li><strong>K_clutter:</strong> Clutter morphology correction (+4 dB Dense Urban, 0 dB Urban, -7.5 dB Suburban, -18 dB Rural)</li>
            </ul>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-200 block mb-1">
                Log-Normal Shadow Fading Margin (σ_SF & Coverage Probability):
              </span>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Large-scale signal fluctuations follow a log-normal distribution with standard deviation <code className="text-cyan-300">σ_SF</code> (sigma). To achieve edge coverage probability <code className="text-cyan-300">P_cov</code>, the required margin is:
              </p>
              <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 font-mono text-cyan-300 text-[11px]">
                M_SF = z · σ_SF = Q⁻¹(1 - P_cov) · σ_SF
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                * Examples: P=90% (z=1.28, M_SF=10.2 dB for σ=8dB); P=95% (z=1.64, M_SF=13.2 dB for σ=8dB); P=98% (z=2.05, M_SF=16.4 dB).
              </p>
            </div>
          </div>

          {/* Section 2: Reference Signal Power (3GPP EPRE) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-cyan-300 font-mono mb-2">
              2. 3GPP Reference Signal (RS / SS-PBCH) EPRE Calculation
            </h3>
            <p className="text-slate-300 mb-2">
              In 4G LTE and 5G NR, transmitter power is distributed evenly across all subcarriers. The Energy Per Resource Element (EPRE) is:
            </p>
            <div className="bg-slate-900 p-3 rounded border border-slate-800 font-mono text-cyan-300 text-[11px]">
              P_RS (dBm) = P_total_tx (dBm) - 10 · log₁₀(N_subcarriers) + P_boost (dB)
            </div>
            <p className="mt-2 text-slate-400">
              For example, in a 20 MHz LTE cell with 100 PRBs (1200 subcarriers), a 46 dBm (40W) eNodeB produces an RS power of:
              <br />
              <code className="text-slate-200">46 - 10·log₁₀(1200) = 46 - 30.79 = +15.2 dBm/RE</code>.
            </p>
          </div>

          {/* Section 3: 3GPP Throughput (TS 38.306) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-cyan-300 font-mono mb-2">
              3. Peak Throughput Standard Formula (3GPP TS 38.306 §4.1.2)
            </h3>
            <div className="bg-slate-900 p-3 rounded border border-slate-800 font-mono text-cyan-300 text-[11px] overflow-x-auto">
              Rate (Mbps) = 10⁻⁶ · Σ [ v_layers · Q_m · f · R_max · (12 · N_PRB / T_s) · (1 - OH) ]
            </div>
            <p className="mt-2 text-slate-400">
              Where <strong className="text-slate-200">v_layers</strong> is MIMO rank (up to 4 or 8), <strong className="text-slate-200">Q_m</strong> is modulation order (8 for 256QAM, 6 for 64QAM, 4 for 16QAM, 2 for QPSK), <strong className="text-slate-200">f</strong> is TDD DL/UL duty ratio, and <strong className="text-slate-200">OH</strong> is control channel overhead (0.14 for DL, 0.08 for UL).
            </p>
          </div>

          {/* Section 4: DL vs UL Bottleneck Rules of Thumb */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-300 font-mono mb-2">
              4. Telecom Guru Rule of Thumb: Overcoming UL Bottlenecks
            </h3>
            <p className="text-slate-300 mb-2">
              In commercial mobile cellular networks, the Uplink is almost always the coverage limiter by 3 to 10 dB because:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Handsets are limited to +23 dBm (200 mW) due to battery life and SAR human absorption standards.</li>
              <li>Base stations transmit at +46 to +53 dBm (40W to 200W) with 18 to 25 dBi high-gain antenna arrays.</li>
              <li><strong>Remedies:</strong> High-Power UE (HPUE Class 2 at +26 dBm), SRS-based 64TR UL Beamforming (combining 64 receive antenna elements to deliver up to +12.5 dB Rx gain), or Fixed Wireless Access (FWA) CPE with directional rooftop antennas.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium font-mono"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
