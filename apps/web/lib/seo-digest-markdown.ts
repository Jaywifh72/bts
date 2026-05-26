// Render a Digest as markdown. Email-friendly (no fancy syntax). The
// GitHub-Actions cron drops this verbatim into a new issue body, which
// fires GitHub email notifications.

import type { Digest, DigestNumber } from './seo-digest';

export function renderDigestMarkdown(d: Digest): string {
  const lines: string[] = [];

  // ----- Header -------------------------------------------------------
  lines.push(`# 📊 SEO / AEO weekly digest — ${d.thisWeekStart} → ${d.thisWeekEnd}`);
  lines.push('');
  lines.push(
    `Compares the last 7 days (**${d.thisWeekStart} → ${d.thisWeekEnd}**) against the prior 7 days (**${d.lastWeekStart} → ${d.lastWeekEnd}**).`,
  );
  lines.push('');

  // ----- TL;DR --------------------------------------------------------
  lines.push('## TL;DR');
  lines.push('');
  if (d.gsc.ok) {
    lines.push(`- Organic Google clicks: ${numberLine(d.gsc.clicks)}`);
    lines.push(`- Organic impressions: ${numberLine(d.gsc.impressions)}`);
    lines.push(`- Avg ranking position (lower is better): ${numberLine(d.gsc.position, { lowerIsBetter: true, digits: 1 })}`);
  } else {
    lines.push(`- GSC data unavailable: _${d.gsc.reason}_`);
  }
  lines.push(`- AEO observations this week: **${d.aeo.observationsThisWeek.toLocaleString()}** ` +
    `(vs ${d.aeo.observationsLastWeek.toLocaleString()} last week, ${pct(d.aeo.observationsThisWeek, d.aeo.observationsLastWeek)})`);
  lines.push(`- AEO citations this week: **${d.aeo.totalCitationsThisWeek.toLocaleString()}** ` +
    `(vs ${d.aeo.totalCitationsLastWeek.toLocaleString()} last week)`);
  lines.push(`- **CineCanon citations this week: ${d.aeo.cinecanonCitationsThisWeek.toLocaleString()}** ` +
    `(vs ${d.aeo.cinecanonCitationsLastWeek.toLocaleString()} last week) — the hero metric`);
  lines.push(`- AEO cycles: ${d.aeo.cyclesOk} ok / ${d.aeo.cyclesPartial} partial / ${d.aeo.cyclesFailed} failed ` +
    `(weekly est. cost $${d.aeo.estCostUsd.toFixed(2)})`);
  if (d.alerts.length > 0) {
    lines.push(`- ⚠️ **${d.alerts.length} open alert${d.alerts.length === 1 ? '' : 's'}** — see Alerts section`);
  } else {
    lines.push(`- ✅ No open alerts`);
  }
  lines.push('');

  // ----- GSC ---------------------------------------------------------
  lines.push('## Organic Google performance (GSC)');
  lines.push('');
  if (!d.gsc.ok) {
    lines.push(`_GSC data unavailable: ${d.gsc.reason}_`);
    lines.push('');
  } else {
    lines.push(`Property: \`${d.gsc.site}\``);
    lines.push('');
    lines.push('| Metric | This week | Last week | Δ |');
    lines.push('|---|---:|---:|---:|');
    lines.push(`| Clicks | ${d.gsc.clicks.current.toLocaleString()} | ${d.gsc.clicks.previous.toLocaleString()} | ${signed(d.gsc.clicks)} |`);
    lines.push(`| Impressions | ${d.gsc.impressions.current.toLocaleString()} | ${d.gsc.impressions.previous.toLocaleString()} | ${signed(d.gsc.impressions)} |`);
    lines.push(`| CTR | ${d.gsc.ctr.current.toFixed(2)}% | ${d.gsc.ctr.previous.toFixed(2)}% | ${signedFixed(d.gsc.ctr, 2)}pp |`);
    lines.push(`| Avg position | ${d.gsc.position.current.toFixed(1)} | ${d.gsc.position.previous.toFixed(1)} | ${signedFixed(d.gsc.position, 1, { lowerIsBetter: true })} |`);
    lines.push('');

    if (d.gsc.topQueries.length > 0) {
      lines.push('### Top queries this week');
      lines.push('');
      lines.push('| Query | Clicks | Impressions | CTR | Position |');
      lines.push('|---|---:|---:|---:|---:|');
      d.gsc.topQueries.forEach((q) => {
        lines.push(`| ${escapeMd(q.key)} | ${q.clicks ?? 0} | ${q.impressions ?? 0} | ${((q.ctr ?? 0) * 100).toFixed(1)}% | ${(q.position ?? 0).toFixed(1)} |`);
      });
      lines.push('');
    } else {
      lines.push('_No query data yet — likely because the GSC property is < 72h old._');
      lines.push('');
    }

    if (d.gsc.topPages.length > 0) {
      lines.push('### Top landing pages this week');
      lines.push('');
      lines.push('| Page | Clicks | Impressions | CTR | Position |');
      lines.push('|---|---:|---:|---:|---:|');
      d.gsc.topPages.forEach((p) => {
        lines.push(`| ${escapeMd(p.key)} | ${p.clicks ?? 0} | ${p.impressions ?? 0} | ${((p.ctr ?? 0) * 100).toFixed(1)}% | ${(p.position ?? 0).toFixed(1)} |`);
      });
      lines.push('');
    }
  }

  // ----- AEO --------------------------------------------------------
  lines.push('## AI engine citation landscape (AEO)');
  lines.push('');
  lines.push('### Cycle health');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|---|---:|');
  lines.push(`| Succeeded | ${d.aeo.cyclesOk} |`);
  lines.push(`| Partial | ${d.aeo.cyclesPartial} |`);
  lines.push(`| Failed | ${d.aeo.cyclesFailed} |`);
  lines.push(`| **Total cycles ran** | **${d.aeo.cyclesThisWeek}** |`);
  lines.push(`| Est. engine cost | $${d.aeo.estCostUsd.toFixed(2)} |`);
  lines.push('');

  if (d.aeo.perEngine.length > 0) {
    lines.push('### Per-engine outcomes');
    lines.push('');
    lines.push('| Engine | Observations | Failures |');
    lines.push('|---|---:|---:|');
    d.aeo.perEngine.forEach((e) => {
      const dot = e.fail > 0 ? '🟠' : '🟢';
      lines.push(`| ${dot} ${e.code} | ${e.ok} | ${e.fail} |`);
    });
    lines.push('');
  }

  lines.push('### Hero metric: CineCanon citation share');
  lines.push('');
  const pctOfTotal = d.aeo.totalCitationsThisWeek > 0
    ? ((d.aeo.cinecanonCitationsThisWeek / d.aeo.totalCitationsThisWeek) * 100).toFixed(1)
    : '0.0';
  lines.push(`CineCanon URLs cited: **${d.aeo.cinecanonCitationsThisWeek.toLocaleString()}** of ${d.aeo.totalCitationsThisWeek.toLocaleString()} total citations (${pctOfTotal}%) this week.`);
  lines.push('');
  if (d.aeo.cinecanonCitationsThisWeek === 0) {
    lines.push(`_Still at 0 — typical for the first 4-12 weeks after launch. Climbs as editorial earns share against the top competitive pool below._`);
    lines.push('');
  }

  if (d.aeo.topDomains.length > 0) {
    lines.push('### Top 15 cited domains (the competition)');
    lines.push('');
    lines.push('| # | Domain | Hits | Is us? |');
    lines.push('|---:|---|---:|:---:|');
    d.aeo.topDomains.forEach((dom, i) => {
      lines.push(`| ${i + 1} | \`${dom.domain}\` | ${dom.hits} | ${dom.isCinecanon ? '✅' : '—'} |`);
    });
    lines.push('');
  }

  // ----- Alerts --------------------------------------------------------
  if (d.alerts.length > 0) {
    lines.push('## ⚠️ Open alerts');
    lines.push('');
    d.alerts.forEach((a) => {
      lines.push(`- [#${a.number}](${a.url}) **${escapeMd(a.title)}** — open for ${Math.round(a.age_hours)}h`);
    });
    lines.push('');
  }

  // ----- Footer --------------------------------------------------------
  lines.push('---');
  lines.push('');
  lines.push(`_Generated at ${d.generatedAt}. Auto-fires every Monday at 14:00 UTC via \`.github/workflows/seo-digest.yml\`. Run on-demand via \`/admin/seo/digest\`._`);

  return lines.join('\n');
}

// ----- Helpers --------------------------------------------------------

function numberLine(
  n: DigestNumber,
  opts: { lowerIsBetter?: boolean; digits?: number } = {},
): string {
  const digits = opts.digits ?? 0;
  const curr = digits === 0 ? n.current.toLocaleString() : n.current.toFixed(digits);
  const prev = digits === 0 ? n.previous.toLocaleString() : n.previous.toFixed(digits);
  return `**${curr}** (was ${prev}, ${signedFixed(n, digits, opts)})`;
}

function signed(n: DigestNumber, opts: { lowerIsBetter?: boolean } = {}): string {
  return signedFixed(n, 0, opts);
}

function signedFixed(
  n: DigestNumber,
  digits: number,
  opts: { lowerIsBetter?: boolean } = {},
): string {
  if (n.previous === 0 && n.current === 0) return '–';
  const value = digits === 0 ? Math.round(n.delta).toLocaleString() : n.delta.toFixed(digits);
  const sign = n.delta > 0 ? '+' : '';
  const dirSymbol = opts.lowerIsBetter
    ? (n.delta < 0 ? ' ↗' : n.delta > 0 ? ' ↘' : '')
    : (n.delta > 0 ? ' ↗' : n.delta < 0 ? ' ↘' : '');
  const pctPart = n.deltaPct == null
    ? ''
    : ` (${n.deltaPct > 0 ? '+' : ''}${n.deltaPct.toFixed(1)}%)`;
  return `${sign}${value}${pctPart}${dirSymbol}`;
}

function pct(curr: number, prev: number): string {
  if (prev === 0) return curr === 0 ? '–' : '+∞%';
  const p = ((curr - prev) / prev) * 100;
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
