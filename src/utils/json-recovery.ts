/**
 * Utility to recover valid JSON from a string that might be truncated or wrapped in markdown fences.
 */
export function recoverTruncatedJson(raw: string): any {
  // Step 1: Strip markdown fences
  let s = raw
    .replace(/^```(?:json)?[^\n]*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Step 2: Try parsing as-is first
  try {
    const match = s.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e: any) {
    // Parsing failed, move to recovery
  }

  // Step 3: Recovery — fix common truncation issues
  // Remove trailing commas
  s = s.replace(/,\s*$/, "");
  // Fix hanging key with no value: "key": } or "key":\n}
  s = s.replace(/:\s*([,}\]])/g, ": null$1");
  // Fix hanging key at end of string: "key":
  s = s.replace(/:\s*$/, ": null");
  
  // Close unclosed arrays
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    for (let i = 0; i < openBrackets - closeBrackets; i++) s += "]";
  }
  
  // Close unclosed objects
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    for (let i = 0; i < openBraces - closeBraces; i++) s += "}";
  }
  
  // Remove trailing commas before ] or }
  s = s.replace(/,\s*([}\]])/g, "$1");

  try {
    const match = s.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e: any) {
    // console.log(`[recoverTruncatedJson] Recovery parse failed: ${e.message}`);
  }

  console.warn("[recoverTruncatedJson] All recovery attempts failed. Returning empty object.");
  return {};
}
