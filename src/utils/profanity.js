const BAD_WORDS = [
  "đm", "dm", "dcm", "vcl", "đkm", "cl", "clgt",
  "con cặc", "con cac", "cặc", "cac", "lồn", "lon", "đéo", "deo",
  "điếm", "diem", "mẹ mày", "me may", "fuck", "shit", "bitch",
  "asshole", "đụ", "du ma", "đụ má", "đmm", "dmm", "vcl", "vkl",
  "vcc", "dâm", "dam", "hãm", "ham", "ngu", "óc chó", "oc cho",
  "ngu học", "cút", "cut", "đĩ", "đồ tồi", "đồ khốn", "đồ khốn nạn",
];

/**
 * Splits text into segments, identifying which segments are profane.
 */
export const getProfanitySegments = (text) => {
  if (!text) return [];

  const segments = [];
  let lastIndex = 0;

  // Sort bad words by length (longest first) to avoid matching part of a phrase
  const sortedBadWords = [...BAD_WORDS].sort((a, b) => b.length - a.length);

  // Create regex pattern to match these words as whole units
  // We use (\b|$) etc but for Vietnamese we'll use a broader approach
  const pattern = sortedBadWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  let match;
  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];

    // Check if it's a stand-alone word or part of a phrase (simple boundary check)
    // For Vietnamese, we just check spaces/start/end or punctuation
    const beforeIdx = match.index - 1;
    const afterIdx = match.index + matchedText.length;

    const charBefore = beforeIdx >= 0 ? text[beforeIdx] : ' ';
    const charAfter = afterIdx < text.length ? text[afterIdx] : ' ';

    const isBoundary = (char) => /[\s\.,\!\?\(\)\[\]\{\}]/.test(char);

    if (isBoundary(charBefore) && isBoundary(charAfter)) {
      // Add safe text before match
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index), isProfane: false });
      }
      // Add profane match
      segments.push({ text: matchedText, isProfane: true });
      lastIndex = regex.lastIndex;
    } else {
      // Not a boundary match, just keep going but don't mark as profane yet
      // This helps avoid matching "ass" in "glass"
      // However, we need to manually move the lastIndex if we skip
      // Actually, regex.lastIndex is already set correctly by exec.
      // But we need to make sure we don't skip the actual start of the word later.
      // For simplicity in this small project, we'll just treat it as safe text for now
      // and let the next loop iteration find other matches if any.
    }
  }

  // Add remaining safe text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isProfane: false });
  }

  // If we had skips, we might have overlapping safe segments. 
  // Let's refine: if lastIndex didn't move it means it was a non-boundary match.
  // We should just let the loop continue.

  return segments;
};
