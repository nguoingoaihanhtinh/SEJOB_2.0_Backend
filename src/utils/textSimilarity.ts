/**
 * Tokenizes text into an array of lowercase words, stripping punctuation.
 * Filters out extremely short stop-words to improve similarity focus on keywords.
 */
export function getTokens(text: string): string[] {
    if (!text) return [];
    return text
        .toLowerCase()
        // Replace non-alphanumeric (except some programming symbols like C++, C#) with space
        .replace(/[^a-z0-9+#]/gi, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2); // Ignore 'a', 'to', 'is', 'it'
}

/**
 * Calculates Cosine Similarity between two text strings based on Euclidean word frequency.
 * Returns a value between 0.0 and 1.0 (1.0 meaning exact match).
 */
export function calculateCosineSimilarity(text1: string, text2: string): number {
    const tokens1 = getTokens(text1);
    const tokens2 = getTokens(text2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    // Build the vocabulary set
    const allTokens = Array.from(new Set([...tokens1, ...tokens2]));

    // Create frequency vectors for Text 1 and Text 2
    const vector1 = new Array(allTokens.length).fill(0);
    const vector2 = new Array(allTokens.length).fill(0);

    for (const token of tokens1) {
        const index = allTokens.indexOf(token);
        vector1[index]++;
    }

    for (const token of tokens2) {
        const index = allTokens.indexOf(token);
        vector2[index]++;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < allTokens.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        mag1 += vector1[i] * vector1[i];
        mag2 += vector2[i] * vector2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (mag1 * mag2);
}
