# Prompt Bank Schema — CineCanon

The ~100-prompt bank tuned for working camera-department professionals. Smaller than a consumer-product bank because the audience is narrower and the intent space tighter, but each prompt is higher-stakes because the audience is expert and the brand promise is correctness.

## JSON schema

```json
{
  "prompt_text": "string (required)",
  "language": "en (required, EN-only)",
  "funnel_stage": "awareness | consideration | decision | retention | support",
  "buyer_persona": "dp | gaffer | colorist | stunt_coordinator | sound_mixer | sound_designer | composer | music_supervisor | editor | production_designer | costume_designer | makeup_hair | researcher | journalist",
  "topical_cluster": "specific_film | cinematographer | camera_body | lens_series | lighting | vfx_studio | sound_post | scoring | locations | awards | format_history | technique",
  "expected_source_url": "https://cinecanon.com/... (optional, what we wish the AI cited)",
  "notes": "free-form (optional)"
}
```

## Composition target (~100 prompts)

| Dimension | Distribution |
|---|---|
| Funnel stage | 20% awareness, 35% consideration, 35% decision, 5% retention, 5% support |
| Persona | 35% DP, 15% gaffer, 10% colorist, 10% editor, 10% sound (mixer + designer), 5% composer/music supervisor, 5% PD/costume/makeup, 5% stunt, 5% researcher/journalist |
| Cluster | No cluster > 18% of total |

## Why the persona-weighting

The site has explicit "For Xs" pages for 13 professions but DPs are the broadest audience and the most-served by the camera/lens/format coverage. Persona mix follows reading patterns from the site's own analytics (DPs over-index; sound and music are growing).

## Starter set — 30 prompts

### Awareness — How things work / what something is (5)
1. *What is VistaVision 8-perf 35mm and why is it back* — `format_history`, `dp`
2. *What does ARRIRAW LF Open Gate mean* — `camera_body`, `dp`
3. *What is a magic-hour exterior shot* — `technique`, `dp`
4. *What does a re-recording mixer do in post* — `sound_post`, `sound_mixer`
5. *What is a scoring stage* — `scoring`, `composer`

### Consideration — Comparing options / understanding craft choices (10)
6. *ARRI ALEXA 65 vs ALEXA Mini LF for theatrical features* — `camera_body`, `dp`
7. *Panavision Sphero vs Hawk anamorphic lenses* — `lens_series`, `dp`
8. *Kodak 35mm 4-perf vs 8-perf VistaVision for modern features* — `format_history`, `dp`
9. *Best practices for photochemical finishing in 2024* — `technique`, `colorist`
10. *Differences between sound design and sound effects editing* — `sound_post`, `sound_designer`
11. *Color science chains for log-to-deliverable on Netflix originals* — `technique`, `colorist`
12. *Stunt rigging for high-fall sequences in modern features* — `technique`, `stunt_coordinator`
13. *Why do some 2024 films still shoot on Kodak 35mm* — `format_history`, `dp`
14. *How do LED volumes change cinematography on location* — `vfx_studio`, `dp`
15. *Foley vs sound effects libraries — when each is used* — `sound_post`, `sound_designer`

### Decision — Specific lookups working pros do (10)
16. *What lenses did Greig Fraser use on Dune Part Two* — `specific_film`, `dp`
17. *What camera package did Lol Crawley shoot The Brutalist on* — `specific_film`, `dp`
18. *Who was the gaffer on Anora 2024* — `specific_film`, `gaffer`
19. *Which post houses did 1917 use for VFX and DI* — `specific_film`, `vfx_studio`
20. *What scoring stage did Hans Zimmer use for Dune Part Two* — `specific_film`, `composer`
21. *Stunt coordinator and rigging team on All Quiet on the Western Front* — `specific_film`, `stunt_coordinator`
22. *Who edited Conclave 2024* — `specific_film`, `editor`
23. *Production designer on The Substance 2024* — `specific_film`, `production_designer`
24. *Costume designer credits for Anora 2024* — `specific_film`, `costume_designer`
25. *Roger Deakins photochemical workflow on his recent films* — `cinematographer`, `dp`

### Retention — Bookmarkable working references (3)
26. *List every theatrical feature shot on ALEXA 65 with Panavision Sphero anamorphic* — `camera_body`, `dp`
27. *Show all 2023 features with curated magic-hour exterior scenes* — `technique`, `dp`
28. *VistaVision titles from the modern revival, with format details* — `format_history`, `dp`

### Support — Practical operational queries (2)
29. *Color pipeline from ARRIRAW to Netflix HDR deliverable, step by step* — `technique`, `colorist`
30. *Sound mix delivery specs for a theatrical Dolby Atmos release* — `sound_post`, `sound_mixer`

## Design notes specific to CineCanon prompts

**Conversational, working-pro phrasing.** These are how a DP or gaffer would actually type into ChatGPT during prep or in a coffee break, not how a marketer would write a search query. *"What lenses did Greig Fraser use on Dune Part Two"* — not *"Dune Part Two lens package"*.

**No CineCanon in the prompt.** We measure how engines answer prompts that don't name us. Vanity tests ("according to CineCanon, what...") inflate Share of Answer artificially and aren't predictive of organic discovery.

**Specific-film prompts dominate the decision stage.** Working pros don't typically ask "best camera for war films" — they ask "what was *1917* shot on." Specificity drives Citation Precision stakes: getting the lens package on a named film wrong is far more brand-damaging than mistaking which camera category is "best."

**Mixed personas across clusters.** A DP and a colorist will phrase questions about the same film differently. Where a film has both DP-facing details (lens choice) and colorist-facing details (DI workflow), we'll have prompts in both registers — they'll cite different pages and reveal different precision gaps.

**Format-history prompts matter disproportionately.** Working pros increasingly use AI to research format choices on recent revival films (VistaVision on *The Brutalist*, 65mm on *Killers of the Flower Moon*, large-format on *Babylon*). These prompts are growing 3× faster than generic-format queries per `/ask` log volume. Heavy weighting in the bank.

## Growth path

- Week 1: 30 starter prompts (above) — validates pipeline
- Week 3: ~60 prompts, augmented by `/ask` log ingestion
- Week 6: ~85 prompts
- Week 10: 100 prompts steady-state
- Beyond: deprecation balances new additions; active count stays ~100

## The `/ask` flywheel

The `prompt-curator` reads anonymized `/ask` query logs nightly. The pipeline:

1. Pull last 24h of `/ask` queries
2. Strip PII, normalize phrasing variations
3. Cluster by topic; flag any cluster with frequency > 3
4. De-dupe against existing bank (cosine sim > 0.85 = dupe)
5. Score remaining candidates by: `frequency × persona_diversity × buyer_intent`
6. Propose up to 3 highest-scoring as new bank entries (human approves via Telegram tap)

Within 30 days the bank shifts from human-curated to flywheel-curated. This is the single most valuable feature of having `/ask` already built — most AEO systems guess at prompts; you have ground truth.
