/**
 * Lightweight, dependency-free typo-tolerant search.
 *
 * The product catalog is served from an in-memory store hydrated from
 * Postgres (see store/hydrate.ts), not queried live per-request — so rather
 * than a Postgres `pg_trgm` similarity query, typo tolerance is implemented
 * here as a JS-side fallback: try exact substring matching first (fast,
 * predictable ranking), and only fall back to token-level edit-distance
 * matching when the exact pass finds nothing. This is the natural bridge
 * described in the audit; if the catalog grows large enough that in-memory
 * matching becomes a bottleneck, this is the seam to swap for a real
 * `pg_trgm` similarity query or a hosted search index (Meilisearch/Algolia).
 */
/**
 * Returns items matching `query`, trying an exact substring pass first and
 * falling back to typo-tolerant token matching (ranked by edit distance) only
 * if the exact pass returns nothing.
 */
export declare function fuzzySearch<T>(items: T[], query: string, getHaystacks: (item: T) => string[]): T[];
