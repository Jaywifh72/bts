-- Migration 0094 — expand aeo_citation_pools based on real engine data.
--
-- The first 4 production cycles surfaced three high-frequency citation
-- pools that aren't in the original 10 from migration 0091:
--   • Reddit (20+ hits/cycle — r/cinematography, r/Filmmakers, r/AskCinematographers)
--   • Quora (5+ hits/cycle — Q&A threads on cinematography questions)
--   • cinematography.com (8+ hits/cycle — niche craft forum)
--
-- All three are forum/community tier. None tracked = blind spot for the
-- citation-landscape-watcher and earned-media-targets pipelines.
--
-- ON CONFLICT DO NOTHING keeps the migration idempotent.

INSERT INTO aeo_citation_pools (name, primary_domain, also_known_as, category, tier) VALUES
  ('Reddit r/cinematography',  'reddit.com',         array['Reddit','r/cinematography','r/Filmmakers','r/AskCinematographers'], 'community',  2),
  ('Quora',                    'quora.com',          array['Quora'],                                                            'community',  3),
  ('cinematography.com forum', 'cinematography.com', array['cinematography.com','cinematography forum'],                        'craft_forum', 2)
ON CONFLICT DO NOTHING;
