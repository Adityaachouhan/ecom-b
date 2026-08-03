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
function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}
/** Max edit distance tolerated for a token of the given length to still count as a fuzzy match. */
function toleranceFor(tokenLength) {
    if (tokenLength <= 3)
        return 0;
    if (tokenLength <= 5)
        return 1;
    return 2;
}
/**
 * Returns items matching `query`, trying an exact substring pass first and
 * falling back to typo-tolerant token matching (ranked by edit distance) only
 * if the exact pass returns nothing.
 */
export function fuzzySearch(items, query, getHaystacks) {
    const q = query.trim().toLowerCase();
    if (!q)
        return items;
    const exact = items.filter((item) => getHaystacks(item).some((h) => h.toLowerCase().includes(q)));
    if (exact.length > 0)
        return exact;
    const qTokens = q.split(/\s+/).filter(Boolean);
    const scored = items
        .map((item) => {
        const tokens = getHaystacks(item).join(' ').toLowerCase().split(/[\s,/-]+/).filter(Boolean);
        let bestScore = Infinity;
        for (const qt of qTokens) {
            const tolerance = toleranceFor(qt.length);
            for (const t of tokens) {
                if (Math.abs(t.length - qt.length) > tolerance + 1)
                    continue;
                const dist = levenshtein(qt, t);
                if (dist <= tolerance && dist < bestScore)
                    bestScore = dist;
            }
        }
        return { item, score: bestScore };
    })
        .filter((s) => s.score !== Infinity)
        .sort((a, b) => a.score - b.score);
    return scored.map((s) => s.item);
}
