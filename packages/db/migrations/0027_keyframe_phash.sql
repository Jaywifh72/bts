-- E-30 — pHash duplicate detection on production_keyframes.
--
-- pHash is a 64-bit perceptual hash derived from an 8x8 DCT of a
-- grayscale-downscaled image. Hamming distance between hashes ≈
-- visual similarity:
--   distance ≤ 5 → near-identical (duplicate / same shot)
--   distance ≤ 10 → very similar (same scene, different framing)
--   distance > 20 → unrelated
--
-- Stored as bigint (8 bytes) so we can use Postgres' bit operators
-- via @ (bit_xor) + bit_count() popcount for distance queries.
-- A regular b-tree index covers exact-match equality; for
-- approximate-match we sequential-scan with bit_count, which is
-- fine for the keyframe dataset size (low thousands).
ALTER TABLE production_keyframes ADD COLUMN phash bigint;
CREATE INDEX production_keyframes_phash_idx ON production_keyframes (phash) WHERE phash IS NOT NULL;
