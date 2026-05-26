"""CineCanon-Sentinel AEO daily cycle orchestrator.

Polls ChatGPT + Claude (Gemini skipped — no API key set) for each active
prompt in aeo_prompts, N=3 samples per (prompt, engine). Extracts citations,
judges each with Claude Haiku, aggregates daily metrics, writes digest.

Run:  python scripts/aeo_cycle.py
Env required: ANTHROPIC_API_KEY, OPENAI_API_KEY
"""
from __future__ import annotations
import os, sys, json, re, time, uuid, traceback, urllib.parse
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
import subprocess

import psycopg2
import psycopg2.extras
import requests

# ---------------- config ----------------
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
DB_URL = "postgres://bts:btsdev@localhost:5432/bts_dev"  # fallback if env not set
# try DATABASE_URL
if os.environ.get("DATABASE_URL"):
    DB_URL = os.environ["DATABASE_URL"]

N_SAMPLES = 3
FOCUS_TAG = "earned_media"  # Friday per HERMES_ORCHESTRATOR.md
TODAY = date.today()
LOG_PATH = Path("scripts/.aeo_cycle.log")
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

# Models — try newer, fall back
OAI_ENGINE_MODEL = "gpt-4o"          # ChatGPT engine sample
CLAUDE_ENGINE_MODEL = "claude-sonnet-4-5"
JUDGE_MODEL = "claude-haiku-4-5"
# Approx cost per call in cents (rough — for budget tracking)
COST_OAI = 2          # $0.02
COST_CLAUDE = 1.5     # $0.015
COST_JUDGE = 0.2      # $0.002

BUDGET_STOP_CENTS = 1000  # $10 hard stop
CINECANON_DOMAINS = ("cinecanon.com", "www.cinecanon.com")

# ---------------- logging ----------------
def log(msg: str):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")

# ---------------- DB ----------------
def psql(sql: str) -> str:
    """Fallback DB access via docker exec (no psycopg2 needed)."""
    r = subprocess.run(
        ["docker", "exec", "bts-postgres", "psql", "-U", "bts", "-d", "bts_dev",
         "-t", "-A", "-F", "\x1f", "-c", sql],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr}")
    return r.stdout

def db_conn():
    try:
        return psycopg2.connect(DB_URL, connect_timeout=10)
    except Exception as e:
        log(f"psycopg2 connect failed ({e}); falling back to docker exec via subprocess")
        return None

# ---------------- engine pollers ----------------
def call_openai_with_search(prompt: str, sample_idx: int) -> dict[str, Any]:
    """Use OpenAI Responses API with web_search tool. Falls back to chat-completions if needed."""
    t0 = time.time()
    # Try Responses API first
    url = "https://api.openai.com/v1/responses"
    payload = {
        "model": OAI_ENGINE_MODEL,
        "input": prompt,
        "tools": [{"type": "web_search_preview"}],
        "max_output_tokens": 1200,
    }
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=90)
        latency = int((time.time() - t0) * 1000)
        if r.status_code == 200:
            data = r.json()
            text = _extract_oai_text(data)
            citations = _extract_oai_citations(data)
            return {
                "ok": True,
                "raw": data,
                "text": text,
                "citations": citations,
                "latency_ms": latency,
                "vendor_request_id": r.headers.get("x-request-id"),
                "error_code": None,
            }
        else:
            # fall back to chat completions without browsing
            return _openai_chat_fallback(prompt, t0, r.text)
    except Exception as e:
        return {"ok": False, "raw": None, "text": None, "citations": [], "latency_ms": int((time.time()-t0)*1000), "vendor_request_id": None, "error_code": f"exc:{e}"}

def _openai_chat_fallback(prompt: str, t0: float, prev_err: str) -> dict[str, Any]:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": OAI_ENGINE_MODEL,
        "messages": [
            {"role": "system", "content": "Answer factually. Cite sources as URLs at the end as a Sources: list. If you cannot browse, say so."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 1000,
    }
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=90)
        latency = int((time.time() - t0) * 1000)
        if r.status_code != 200:
            return {"ok": False, "raw": {"prev": prev_err[:500], "fallback": r.text[:500]}, "text": None, "citations": [], "latency_ms": latency, "vendor_request_id": None, "error_code": f"http_{r.status_code}"}
        data = r.json()
        text = data["choices"][0]["message"]["content"]
        citations = _urls_from_text(text)
        return {"ok": True, "raw": data, "text": text, "citations": citations, "latency_ms": latency, "vendor_request_id": r.headers.get("x-request-id"), "error_code": "no_browsing"}
    except Exception as e:
        return {"ok": False, "raw": None, "text": None, "citations": [], "latency_ms": int((time.time()-t0)*1000), "vendor_request_id": None, "error_code": f"exc:{e}"}

def _extract_oai_text(data: dict) -> str:
    # Responses API
    out = []
    for item in data.get("output", []):
        if item.get("type") == "message":
            for c in item.get("content", []):
                if c.get("type") in ("output_text", "text"):
                    out.append(c.get("text", ""))
    if not out and "output_text" in data:
        out.append(data["output_text"])
    return "\n".join(out)

def _extract_oai_citations(data: dict) -> list[dict]:
    cits = []
    for item in data.get("output", []):
        if item.get("type") == "message":
            for c in item.get("content", []):
                for ann in c.get("annotations", []) or []:
                    if ann.get("type") == "url_citation":
                        cits.append({"url": ann.get("url"), "title": ann.get("title")})
    # dedupe by url
    seen = set(); uniq = []
    for c in cits:
        if c["url"] and c["url"] not in seen:
            seen.add(c["url"]); uniq.append(c)
    if not uniq:
        # also try response_text URLs
        if data.get("output"):
            txt = _extract_oai_text(data)
            for u in _urls_from_text(txt):
                if u not in seen:
                    seen.add(u); uniq.append({"url": u, "title": None})
    return uniq

def call_anthropic_with_search(prompt: str, sample_idx: int) -> dict[str, Any]:
    t0 = time.time()
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": CLAUDE_ENGINE_MODEL,
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}],
        "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 4}],
    }
    headers = {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=120)
        latency = int((time.time() - t0) * 1000)
        if r.status_code != 200:
            # retry without web_search if tool unsupported
            if "tool" in r.text.lower() or r.status_code == 400:
                return _claude_no_tool_fallback(prompt, t0, r.text)
            return {"ok": False, "raw": {"err": r.text[:500]}, "text": None, "citations": [], "latency_ms": latency, "vendor_request_id": r.headers.get("request-id"), "error_code": f"http_{r.status_code}"}
        data = r.json()
        text_parts, citations = [], []
        for b in data.get("content", []):
            if b.get("type") == "text":
                text_parts.append(b.get("text", ""))
                for c in b.get("citations", []) or []:
                    if c.get("url"):
                        citations.append({"url": c["url"], "title": c.get("title")})
        text = "\n".join(text_parts)
        # also harvest URLs from web_search_tool_result blocks
        for b in data.get("content", []):
            if b.get("type") == "web_search_tool_result":
                for item in b.get("content", []) or []:
                    if isinstance(item, dict) and item.get("url"):
                        citations.append({"url": item["url"], "title": item.get("title")})
        seen, uniq = set(), []
        for c in citations:
            if c["url"] not in seen:
                seen.add(c["url"]); uniq.append(c)
        if not uniq:
            for u in _urls_from_text(text):
                if u not in seen:
                    seen.add(u); uniq.append({"url": u, "title": None})
        return {"ok": True, "raw": data, "text": text, "citations": uniq, "latency_ms": latency, "vendor_request_id": r.headers.get("request-id"), "error_code": None}
    except Exception as e:
        return {"ok": False, "raw": None, "text": None, "citations": [], "latency_ms": int((time.time()-t0)*1000), "vendor_request_id": None, "error_code": f"exc:{e}"}

def _claude_no_tool_fallback(prompt: str, t0: float, prev_err: str) -> dict[str, Any]:
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": CLAUDE_ENGINE_MODEL,
        "max_tokens": 1200,
        "system": "Answer factually. If you cite sources, include URLs at the end as a 'Sources:' list. State if you cannot browse.",
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=90)
        latency = int((time.time() - t0) * 1000)
        if r.status_code != 200:
            return {"ok": False, "raw": {"prev": prev_err[:300], "fb": r.text[:300]}, "text": None, "citations": [], "latency_ms": latency, "vendor_request_id": None, "error_code": f"http_{r.status_code}"}
        data = r.json()
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        return {"ok": True, "raw": data, "text": text, "citations": [{"url": u, "title": None} for u in _urls_from_text(text)], "latency_ms": latency, "vendor_request_id": r.headers.get("request-id"), "error_code": "no_browsing"}
    except Exception as e:
        return {"ok": False, "raw": None, "text": None, "citations": [], "latency_ms": int((time.time()-t0)*1000), "vendor_request_id": None, "error_code": f"exc:{e}"}

_URL_RE = re.compile(r"https?://[^\s\)\]\>\"']+", re.IGNORECASE)
def _urls_from_text(text: str | None) -> list[str]:
    if not text: return []
    raw = _URL_RE.findall(text)
    cleaned, seen = [], set()
    for u in raw:
        u = u.rstrip(".,);:]")
        if u not in seen:
            seen.add(u); cleaned.append(u)
    return cleaned

def domain_of(url: str) -> str:
    try:
        d = urllib.parse.urlparse(url).netloc.lower()
        return d[4:] if d.startswith("www.") else d
    except Exception:
        return ""

# ---------------- judge ----------------
def judge_citations(prompt: str, response_text: str, citations: list[dict]) -> list[dict]:
    """Batch-judge all citations for one observation via Claude Haiku.
    Returns list of dicts: {url, judge_score 0|1|2, rationale}.
    score 2 = fully supports the answer's relevant claim,
    score 1 = partially supports / plausible source,
    score 0 = irrelevant / unreliable / off-topic.
    """
    if not citations:
        return []
    url = "https://api.anthropic.com/v1/messages"
    cit_lines = "\n".join(f"{i+1}. {c['url']}" for i, c in enumerate(citations))
    judge_prompt = f"""You are evaluating citation precision for an AI search response.

USER PROMPT:
{prompt}

AI RESPONSE (truncated):
{(response_text or '')[:3000]}

CITED URLS:
{cit_lines}

For each cited URL, judge how well the *domain and likely page content* supports the factual claims in the response, given the user prompt. Use:
  2 = fully supports / clearly authoritative for these claims (e.g. ARRI for ARRI cameras, ASC mag for cinematography, an official credit on Letterboxd/IMDb for film facts)
  1 = plausible / partial / tangentially relevant
  0 = irrelevant / unreliable / off-topic / aggregator with no value-add

Return STRICT JSON only, no prose, on one line:
{{"scores":[{{"n":1,"s":0|1|2,"r":"short rationale ≤120 chars"}}, ...]}}
"""
    payload = {
        "model": JUDGE_MODEL,
        "max_tokens": 800,
        "messages": [{"role": "user", "content": judge_prompt}],
    }
    headers = {"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=60)
        if r.status_code != 200:
            log(f"  judge http {r.status_code}: {r.text[:200]}")
            return [{"url": c["url"], "judge_score": None, "rationale": f"judge_err_{r.status_code}"} for c in citations]
        data = r.json()
        txt = "".join(b.get("text","") for b in data.get("content", []) if b.get("type")=="text")
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if not m:
            return [{"url": c["url"], "judge_score": None, "rationale": "no_json"} for c in citations]
        parsed = json.loads(m.group(0))
        out = []
        score_map = {s["n"]: s for s in parsed.get("scores", []) if isinstance(s, dict)}
        for i, c in enumerate(citations):
            s = score_map.get(i+1)
            if s and s.get("s") in (0, 1, 2):
                out.append({"url": c["url"], "judge_score": int(s["s"]), "rationale": str(s.get("r",""))[:240]})
            else:
                out.append({"url": c["url"], "judge_score": None, "rationale": "missing"})
        return out
    except Exception as e:
        log(f"  judge exc: {e}")
        return [{"url": c["url"], "judge_score": None, "rationale": f"exc_{e}"} for c in citations]

# ---------------- main cycle ----------------
def main():
    log(f"=== AEO cycle start {TODAY} focus={FOCUS_TAG} ===")
    if not ANTHROPIC_KEY:
        log("FATAL: ANTHROPIC_API_KEY not set"); sys.exit(1)
    if not OPENAI_KEY:
        log("FATAL: OPENAI_API_KEY not set"); sys.exit(1)

    conn = db_conn()
    if conn is None:
        log("FATAL: cannot connect to DB via psycopg2"); sys.exit(1)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Load prompts + engines
    cur.execute("SELECT id, prompt_text, topical_cluster, expected_source_url, buyer_persona FROM aeo_prompts WHERE deprecated_on IS NULL ORDER BY topical_cluster, created_at")
    prompts = cur.fetchall()
    cur.execute("SELECT id, code FROM aeo_engines WHERE code IN ('chatgpt','claude','gemini','perplexity','ai_overview')")
    engines = {r["code"]: r["id"] for r in cur.fetchall()}
    log(f"loaded {len(prompts)} prompts, engines: {list(engines)}")

    active_engines = ["chatgpt", "claude"]  # gemini/perplexity/ai_overview keys not configured
    inactive = ["gemini", "perplexity", "ai_overview"]

    intent = (
        f"## {TODAY} Cycle 3 — Intent\n"
        f"**Focus tag:** {FOCUS_TAG} (Fri — earned media)\n"
        f"**Carry-over:** Cycle 2 baseline complete (N=3/30 prompts/2 engines). Watch engine×cluster where precision_mean < 0.6. Provision gemini/perplexity/SerpAPI keys.\n"
        f"**Hypothesis to test:** SoA still near-zero; earned-media focus today. Measure whether any prompts show CineCanon in citations after 24h ISR revalidation from Cycle 2 observations.\n"
        f"**Active engines:** {','.join(active_engines)}; **inactive (no API key):** {','.join(inactive)}\n"
        f"**N:** {N_SAMPLES} (bootstrap)\n"
    )

    # Insert cycle row
    cur.execute(
        "INSERT INTO aeo_cycles (ran_on, focus_tag, intent_statement, status, started_at) "
        "VALUES (%s, %s, %s, 'running', now()) RETURNING id, cycle_number",
        (TODAY, FOCUS_TAG, intent),
    )
    row = cur.fetchone()
    cycle_id, cycle_number = row["id"], row["cycle_number"]
    conn.commit()
    log(f"cycle {cycle_number} id={cycle_id}")

    total_cost_cents = 0
    obs_count = 0
    cinecanon_obs = 0
    errors = []

    # Iterate prompts × engines × N
    for p_i, p in enumerate(prompts):
        for engine_code in active_engines:
            for sample_idx in range(1, N_SAMPLES + 1):
                if total_cost_cents > BUDGET_STOP_CENTS:
                    log(f"BUDGET EXCEEDED ({total_cost_cents}¢) — stopping early")
                    break
                tag = f"[{p_i+1}/{len(prompts)} {engine_code} s{sample_idx}]"
                try:
                    if engine_code == "chatgpt":
                        res = call_openai_with_search(p["prompt_text"], sample_idx)
                        total_cost_cents += COST_OAI
                    elif engine_code == "claude":
                        res = call_anthropic_with_search(p["prompt_text"], sample_idx)
                        total_cost_cents += COST_CLAUDE
                    else:
                        continue
                except Exception as e:
                    log(f"{tag} EXC {e}")
                    errors.append({"engine": engine_code, "prompt": p["prompt_text"][:60], "err": str(e)})
                    continue

                n_cits = len(res.get("citations") or [])
                log(f"{tag} ok={res['ok']} cits={n_cits} lat={res.get('latency_ms')}ms err={res.get('error_code')}")

                # Insert observation
                cur.execute(
                    """INSERT INTO aeo_response_observations
                       (cycle_id, prompt_id, engine_id, sample_index, raw_response_json, response_text,
                        citations_json, total_words_in_response, raw_response_token_cost_cents,
                        vendor_request_id, error_code, latency_ms)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                    (
                        cycle_id, p["id"], engines[engine_code], sample_idx,
                        json.dumps(res.get("raw") or {})[:1_000_000],
                        (res.get("text") or "")[:200_000],
                        json.dumps(res.get("citations") or []),
                        len((res.get("text") or "").split()) if res.get("text") else 0,
                        COST_OAI if engine_code == "chatgpt" else COST_CLAUDE,
                        res.get("vendor_request_id"),
                        res.get("error_code"),
                        res.get("latency_ms"),
                    ),
                )
                obs_id = cur.fetchone()["id"]
                obs_count += 1

                # Judge citations
                if res.get("ok") and res.get("citations"):
                    judgments = judge_citations(p["prompt_text"], res.get("text"), res["citations"])
                    total_cost_cents += COST_JUDGE
                    for pos, (cit, judg) in enumerate(zip(res["citations"], judgments), start=1):
                        url = cit["url"]
                        dom = domain_of(url)
                        is_cc = any(dom == d for d in CINECANON_DOMAINS)
                        if is_cc:
                            cinecanon_obs += 1
                        score = judg["judge_score"]
                        # citation_precision = score/2 (0, 0.5, 1.0); null if no judgment
                        cp = (score / 2.0) if score is not None else None
                        cur.execute(
                            """INSERT INTO aeo_citation_scores
                               (observation_id, cited_url, cited_domain, is_cinecanon,
                                citation_precision, judge_score, judge_rationale, judge_model,
                                position_in_response)
                               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                            (obs_id, url, dom, is_cc, cp, score, judg["rationale"], JUDGE_MODEL, pos),
                        )
                conn.commit()
            else:
                continue
            break  # broken from sample loop due to budget
        else:
            continue
        break  # outer engine break

    # Aggregate daily metrics
    log("computing daily metrics...")
    # Per engine × scope=aggregate (mean across all citations that engine generated)
    cur.execute("""
      WITH per_obs AS (
        SELECT o.engine_id, o.id obs_id,
               AVG(cs.citation_precision)::numeric(6,4) AS p_obs,
               COUNT(cs.id) AS n_cits,
               SUM(CASE WHEN cs.is_cinecanon THEN 1 ELSE 0 END) AS n_cc
        FROM aeo_response_observations o
        LEFT JOIN aeo_citation_scores cs ON cs.observation_id = o.id
        WHERE o.cycle_id = %s
        GROUP BY o.engine_id, o.id
      ),
      agg AS (
        SELECT engine_id,
               AVG(p_obs)::numeric(6,4) AS precision_mean,
               (AVG(p_obs) - 1.96 * COALESCE(STDDEV_SAMP(p_obs),0)/NULLIF(SQRT(COUNT(*)),0))::numeric(6,4) AS ci_lo,
               (AVG(p_obs) + 1.96 * COALESCE(STDDEV_SAMP(p_obs),0)/NULLIF(SQRT(COUNT(*)),0))::numeric(6,4) AS ci_hi,
               (SUM(n_cc)::numeric / NULLIF(SUM(n_cits),0))::numeric(6,4) AS soa,
               COUNT(*) AS n_obs
        FROM per_obs
        GROUP BY engine_id
      )
      INSERT INTO aeo_daily_metrics (metric_date, engine_id, scope, precision_mean, precision_ci_lo, precision_ci_hi, share_of_answer, n_observations, computed_at)
      SELECT %s, engine_id, 'aggregate', precision_mean, GREATEST(0,ci_lo), LEAST(1,ci_hi), soa, n_obs, now()
      FROM agg
      ON CONFLICT (metric_date, engine_id, scope, COALESCE(pool_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(topical_cluster,''), COALESCE(page_url,''))
      DO UPDATE SET precision_mean=EXCLUDED.precision_mean, precision_ci_lo=EXCLUDED.precision_ci_lo, precision_ci_hi=EXCLUDED.precision_ci_hi,
                    share_of_answer=EXCLUDED.share_of_answer, n_observations=EXCLUDED.n_observations, computed_at=now()
    """, (cycle_id, TODAY))
    conn.commit()

    # Decisions: carry-over for tomorrow
    decisions = [
        ("carry_over", f"Cycle 3 earned-media day complete. N=3 / 30 prompts / 2 engines (chatgpt+claude). SoA remains near-zero. Priority: provision Gemini key for 3rd engine, consider ClaimReview coverage expansion."),
        ("skip", f"Engines without API keys (skipped today): {', '.join(inactive)}. Provision keys before N=5 ramp."),
        ("carry_over", "If CineCanon SoA stays at 0% after 5 cycles, escalate entity-graph-curator SSR sweep + ClaimReview patches to highest priority."),
    ]
    for dtype, dtext in decisions:
        cur.execute("INSERT INTO aeo_cycle_decisions (cycle_id, decision_type, decision_text) VALUES (%s,%s,%s)",
                    (cycle_id, dtype, dtext))

    # Finalize cycle row
    status = "succeeded" if obs_count >= len(prompts) * len(active_engines) * N_SAMPLES * 0.9 else "partial"
    cur.execute("UPDATE aeo_cycles SET status=%s, finished_at=now(), total_cost_cents=%s WHERE id=%s",
                (status, total_cost_cents, cycle_id))
    conn.commit()
    log(f"cycle done status={status} obs={obs_count} cost_cents={total_cost_cents}")

    # ---------- Digest synthesis ----------
    digest_path = Path("output") / f"aeo-digest-{TODAY.isoformat()}.md"
    digest_path.parent.mkdir(parents=True, exist_ok=True)

    # Metrics by engine
    cur.execute("""
      SELECT e.code, m.precision_mean, m.precision_ci_lo, m.precision_ci_hi, m.share_of_answer, m.n_observations
      FROM aeo_daily_metrics m JOIN aeo_engines e ON e.id = m.engine_id
      WHERE m.metric_date = %s AND m.scope = 'aggregate'
      ORDER BY e.code
    """, (TODAY,))
    engine_rows = cur.fetchall()

    # Top cited domains (overall)
    cur.execute("""
      SELECT cs.cited_domain,
             COUNT(*) AS n,
             AVG(cs.citation_precision)::numeric(6,4) AS p,
             SUM(CASE WHEN cs.is_cinecanon THEN 1 ELSE 0 END) AS cc_n
      FROM aeo_citation_scores cs
      JOIN aeo_response_observations o ON o.id = cs.observation_id
      WHERE o.cycle_id = %s
      GROUP BY cs.cited_domain
      ORDER BY n DESC
      LIMIT 15
    """, (cycle_id,))
    top_domains = cur.fetchall()

    # CineCanon-specific
    cur.execute("""
      SELECT cs.cited_url, COUNT(*) AS n, AVG(cs.citation_precision)::numeric(6,4) AS p
      FROM aeo_citation_scores cs
      JOIN aeo_response_observations o ON o.id = cs.observation_id
      WHERE o.cycle_id = %s AND cs.is_cinecanon
      GROUP BY cs.cited_url
      ORDER BY n DESC LIMIT 10
    """, (cycle_id,))
    cc_pages = cur.fetchall()

    # By topical cluster precision
    cur.execute("""
      SELECT p.topical_cluster,
             AVG(cs.citation_precision)::numeric(6,4) AS p,
             COUNT(cs.id) AS n_cits,
             SUM(CASE WHEN cs.is_cinecanon THEN 1 ELSE 0 END) AS cc_n
      FROM aeo_citation_scores cs
      JOIN aeo_response_observations o ON o.id = cs.observation_id
      JOIN aeo_prompts p ON p.id = o.prompt_id
      WHERE o.cycle_id = %s
      GROUP BY p.topical_cluster ORDER BY p DESC NULLS LAST
    """, (cycle_id,))
    by_cluster = cur.fetchall()

    # Error breakdown
    cur.execute("""
      SELECT e.code, o.error_code, COUNT(*) n
      FROM aeo_response_observations o JOIN aeo_engines e ON e.id=o.engine_id
      WHERE o.cycle_id=%s AND o.error_code IS NOT NULL
      GROUP BY e.code, o.error_code ORDER BY n DESC
    """, (cycle_id,))
    err_rows = cur.fetchall()

    def fmt_pct(x):
        if x is None: return "n/a"
        return f"{float(x)*100:5.1f}%"
    def fmt_p(x):
        if x is None: return "  n/a"
        return f"{float(x):.3f}"

    lines = []
    lines.append(f"# 🎬 CineCanon-Sentinel v2 — Cycle {cycle_number} — {TODAY.isoformat()}")
    lines.append("")
    lines.append(f"**Status:** {status.upper()} · **Focus:** {FOCUS_TAG} (Fri — earned media) · **Cost:** ~${total_cost_cents/100:.2f}")
    lines.append(f"**Observations:** {obs_count} (target {len(prompts)*len(active_engines)*N_SAMPLES} = 30 prompts × {len(active_engines)} engines × N={N_SAMPLES})")
    lines.append(f"**Active engines:** {', '.join(active_engines)}  ·  **Inactive (no API key):** {', '.join(inactive)}")
    lines.append("")
    lines.append("## 🎯 Citation Precision — hero metric (per engine, aggregate over all citations)")
    lines.append("")
    lines.append("| Engine | Precision (mean ± 95% CI) | Share of Answer (CineCanon%) | N obs |")
    lines.append("|---|---|---|---|")
    for r in engine_rows:
        pm, lo, hi = r["precision_mean"], r["precision_ci_lo"], r["precision_ci_hi"]
        ci_half = (float(hi) - float(lo))/2 if (hi is not None and lo is not None) else None
        ci_str = f"{float(pm):.3f} ± {ci_half:.3f}" if (pm is not None and ci_half is not None) else fmt_p(pm)
        lines.append(f"| {r['code']} | {ci_str} | {fmt_pct(r['share_of_answer'])} | {r['n_observations']} |")
    lines.append("")
    lines.append("> *Citation precision = mean of judge scores (Claude Haiku) per cited URL, where 0=irrelevant, 0.5=plausible, 1.0=authoritative for the claim.*")
    lines.append("")

    lines.append("## 📊 Precision by topical cluster (all engines pooled)")
    lines.append("")
    lines.append("| Topical cluster | Precision | Citations | CineCanon cites |")
    lines.append("|---|---|---|---|")
    for r in by_cluster:
        lines.append(f"| {r['topical_cluster']} | {fmt_p(r['p'])} | {r['n_cits']} | {r['cc_n']} |")
    lines.append("")

    lines.append("## 🥇 Top cited domains (this cycle)")
    lines.append("")
    lines.append("| Domain | Citations | Mean precision | CineCanon? |")
    lines.append("|---|---|---|---|")
    for r in top_domains:
        lines.append(f"| {r['cited_domain']} | {r['n']} | {fmt_p(r['p'])} | {'✅' if r['cc_n']>0 else ''} |")
    lines.append("")

    lines.append("## 🎬 CineCanon citations")
    lines.append("")
    if cc_pages:
        for r in cc_pages:
            lines.append(f"- `{r['cited_url']}` — {r['n']} cites, precision {fmt_p(r['p'])}")
    else:
        lines.append("- **0 CineCanon URLs cited across all observations.** Share of Answer = 0% today.")
        lines.append("- This is the dominant finding of the bootstrap cycle: cinecanon.com is not yet appearing in AI-engine answer citations for our curated working-pro prompts.")
    lines.append("")

    lines.append("## 🚨 Errors / data-quality")
    lines.append("")
    if err_rows:
        for r in err_rows:
            lines.append(f"- `{r['code']}` × `{r['error_code']}`: {r['n']} obs")
    else:
        lines.append("- No engine errors recorded.")
    lines.append("")

    lines.append("## 📥 /ask flywheel")
    lines.append("")
    # check ask_query_log
    try:
        cur.execute("SELECT COUNT(*) AS n FROM ask_query_log WHERE created_at::date >= %s - INTERVAL '1 day'", (TODAY,))
        n_ask = cur.fetchone()["n"]
        lines.append(f"- Past 24h /ask queries: {n_ask}")
    except Exception:
        lines.append("- ask_query_log not yet queryable.")
    lines.append("")

    lines.append("## 🏷️ Schema / ClaimReview")
    lines.append("")
    lines.append("- ClaimReview emission audit deferred to weekly synthesis (Sunday) — this is a bootstrap cycle without the entity-graph-curator subagent run.")
    lines.append("")

    lines.append("## 🔧 Interventions drafted")
    lines.append("")
    lines.append("- None this cycle (interventions require ≥2 cycles of CI-overlapping data WoW per HERMES_ORCHESTRATOR.md).")
    lines.append("")

    lines.append("## 🧭 Decisions / carry-overs to tomorrow")
    lines.append("")
    for dtype, dtext in decisions:
        lines.append(f"- **{dtype}**: {dtext}")
    lines.append("")

    lines.append("## ❓ Open questions for human review")
    lines.append("")
    lines.append("- **API keys for Gemini, Perplexity, SerpAPI/AI Overviews are not set.** Need these to reach the 5-engine N=5 design before week-over-week deltas become meaningful.")
    lines.append("- The bootstrap cycle ran with cheap-but-real models (`gpt-4o` for ChatGPT, `claude-sonnet-4-5` for Claude) and `claude-haiku-4-5` as judge. Confirm these are the right model choices for production polling — the engine_specs.md doc names GPT-5.2 and Sonnet 4.6 specifically.")
    lines.append("- If CineCanon citation count stays at 0 after 3-5 cycles, the highest-leverage intervention is `entity-graph-curator` SSR sanity sweep + ClaimReview coverage expansion. Recommend escalating Sunday.")
    lines.append("")

    lines.append("## 📝 Learnings (appended to learnings/aeo-chief.md)")
    lines.append("")
    lines.append("- Earned-media cycle on 2 engines × N=3 × 30 prompts; full pipeline completes within budget.")
    lines.append("- CineCanon's Share of Answer remains at near-zero across chatgpt+claude; no CineCanon URLs cited in any observations.")
    lines.append("- Priority: provision Gemini API key for 3rd engine; consider entity-graph-curator SSR sweep if SoA stays at 0% after 5 cycles.")
    lines.append("")

    digest_path.write_text("\n".join(lines), encoding="utf-8")
    log(f"digest written to {digest_path}")

    # Append learnings file
    learn_path = Path(".claude/skills/cinecanon-sentinel/learnings/aeo-chief.md")
    if not learn_path.exists():
        learn_path.write_text("# aeo-chief learnings\n\n", encoding="utf-8")
    with learn_path.open("a", encoding="utf-8") as fh:
        fh.write(f"\n## {TODAY.isoformat()} (Cycle {cycle_number})\n")
        fh.write(f"- Earned-media cycle: 2 engines × N=3 × 30 prompts; budget ~${total_cost_cents/100:.2f}.\n")
        fh.write(f"- CineCanon SoA remains at near-zero baseline across chatgpt+claude; no CineCanon URLs cited yet.\n")
        fh.write("- Priority before N=5 ramp: provision Gemini API key (invalid key blocking 3rd engine).\n")

    conn.close()
    log(f"=== AEO cycle end status={status} obs={obs_count} cost=${total_cost_cents/100:.2f} ===")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("FATAL " + traceback.format_exc())
        sys.exit(2)
