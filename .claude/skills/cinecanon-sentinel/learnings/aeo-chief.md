# aeo-chief learnings


## 2026-05-21 (Cycle 2)
- Bootstrap on 2 engines × N=3 × 30 prompts end-to-end works; budget ~$3.19 per cycle.
- CineCanon Share-of-Answer on curated prompt bank starts at near-zero baseline; cinema-trade incumbents (IMDb, ASC, fxguide) dominate.
- Need API keys for gemini/perplexity/SerpAPI before N=5 ramp; current 2-engine sample is insufficient for week-over-week confidence intervals.

## 2026-05-22 (Cycle 3)
- Earned-media cycle: chatgpt-only (Claude offline); budget ~$3.18.
- 🔴 Anthropic credit exhaustion blocks both Claude polling AND judge scoring (single-point-of-failure). Need fallback judge (GPT-4o-mini) or multiple Anthropic accounts.
- ChatGPT Responses API with web_search_preview produced citations in 35/90 responses (39%). Most citations go to Wikipedia, PetaPixel, YouTube, IMDb — not cinema-trade.
- CineCanon SoA remains at 0% across 3 cycles (492 total observations, 0 CineCanon citations).
- Priority: reload Anthropic credits, provision Gemini key, consider entity-graph-curator SSR sweep if 0% persists.
