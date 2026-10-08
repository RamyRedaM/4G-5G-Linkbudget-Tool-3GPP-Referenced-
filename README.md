It all started some time back, when a friend reached out with a planning question: Can you share a quick cheat sheet for expected cell ranges and field measurements across different bands, channel bandwidths, and technologies (4G vs. 5G)?

Every RF Expert knows that there is no single magic number.A cell range isnt just a static radius, it shifts the second you move from 700 MHz to C-Band, when channel bandwidth scales from 10 MHz to 100 MHz, or when the uplink bottleneck kicks in due to limited UE transmit power. 

So instead of sending another Excel sheet, I decided to build and publish a dedicated LKB tool to solve this E2E and give more Graphs / insights on all related involved parameters that may change the equation, and all related 3GPP based references to be vendor agnostic:

👉 4G & 5G Link Budget; Coverage Calculator
🔗 https://lnkd.in/exsr3Zs3


Tool insights & Capabilities:
==================

📶 Dual 4G/5G Engine: Computes complete link budgets and coverage dynamics for both LTE and 5G NR side-by-side.

📐 3GPP-Standardized Physics: Derives thermal noise (kTB), receiver sensitivity, and noise figures strictly aligned with 3GPP TS 38.104 & TS 36.104.

🌐 Full-Spectrum Agnostic: Covers the entire RF spectrum from low-band Sub-1GHz and Mid-Band (C-Band) up to high-capacity mmWave.

🎛️ Flexible BW & Numerology: Adapts calculations dynamically across 5 MHz to 100 MHz+ channel bandwidths and 5G Subcarrier Spacings (SCS).

⚖️ True UL/DL Bottleneck Detection: Solves Maximum Allowable Path Loss (MAPL) bi-directionally to spot UE power-limited uplink constraints.

🏙️ 3GPP TR 38.901 Propagation Suite: Supports UMa, UMi, and RMa deployment profiles across both LOS & NLOS dual-slope conditions.

📜 Empirical Sub-3GHz Modeling: Includes legacy Okumura-Hata and COST-231 Hata models for standard macro-layer benchmarking.

🏢 O2I amp; Real-World Margins: Integrates log-normal slow fading, 95% area availability targets, body loss & outdoor-to-indoor building penetration.

📍 Radius & ISD Dimensioning: Directly converts calculated MAPL into physical cell radius (km) & Inter-Site Distance (ISD) planning targets.

🎯 Field Measurement Alignment: Bridges theoretical link budgets with live drive-test metrics, mapping expected cell-edge RSRP and SINR thresholds.
