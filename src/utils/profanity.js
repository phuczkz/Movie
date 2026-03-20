const BAD_WORDS = [
  "đm", "dm", "dcm", "vcl", "đkm", "cl", "clgt",
  "con cặc", "con cac", "cặc", "cac", "lồn", "lon", "đéo", "deo",
  "điếm", "diem", "mẹ mày", "me may", "fuck", "shit", "bitch",
  "asshole", "đụ", "du ma", "đụ má", "đmm", "dmm", "vcl", "vkl",
  "vcc", "dâm", "dam", "hãm", "ham", "ngu", "óc chó", "oc cho",
  "ngu học", "cút", "cut", "đĩ", "đồ tồi", "đồ khốn", "đồ khốn nạn",

  // cơ bản
  "đm", "dm", "dcm", "vcl", "đkm", "cl", "clgt",
  "con cặc", "con cac", "cặc", "cac", "lồn", "lon",
  "đéo", "deo", "điếm", "diem", "mẹ mày", "me may",

  // tiếng anh
  "fuck", "shit", "bitch", "asshole", "dick", "pussy",
  "bastard", "slut", "whore", "motherfucker",

  // biến thể viết tắt
  "đmm", "dmm", "vkl", "vcc", "cc", "cccd", "vl", "lol",
  "dkm", "dit", "dit me", "dit me may", "djt", "dmn",

  // biến thể viết sai / lách luật
  "l0n", "l*n", "c4c", "c*c", "d3o", "d*o",
  "f*ck", "sh!t", "b!tch", "4ss", "a$$",
  "ngu vkl", "ngu vl", "ngu lol",

  // câu chửi phổ biến
  "óc chó", "oc cho", "ngu học", "ngu như chó",
  "đồ ngu", "thằng ngu", "con ngu",
  "đồ chó", "chó chết", "đồ khốn", "đồ khốn nạn",
  "đồ tồi", "cút", "biến", "cút mẹ",
  "đi chết đi", "chết mẹ mày", "chết đi",
  "ăn cứt", "ăn cức", "ăn shit",
  "vô học", "mất dạy", "láo", "láo toét",

  // xúc phạm
  "rác rưởi", "phế vật", "đồ bỏ đi",
  "vô dụng", "hèn", "hèn hạ",
  "bẩn", "dơ", "bẩn thỉu",

  // từ liên quan nhạy cảm
  "dâm", "dam", "sex", "xxx", "porn",

  //  bạo lực / đe doạ (tiếng Việt)
  "giết", "giết mày", "tao giết mày", "giết chết", "giết hết",
  "giết người", "giết cả nhà", "giết sạch",
  "đập chết", "đánh chết", "đánh mày chết",
  "đập mày", "đập chết mẹ", "đập bỏ mẹ",
  "chém", "chém mày", "chém chết", "chém bỏ mẹ",
  "đâm", "đâm chết", "đâm mày", "đâm thủng",
  "bắn", "bắn chết", "bắn mày",
  "thiêu sống", "đốt chết", "đốt nhà",
  "treo cổ", "thắt cổ", "cắt cổ",
  "làm thịt", "xử mày", "xử đẹp", "xử nó",
  "dìm chết", "đập đầu", "đập sọ",
  "hành hạ", "tra tấn", "tra tấn chết",

  //  (bạo lực)
  "kill", "kill you", "kill yourself", "kill him", "kill them",
  "i will kill you", "i gonna kill you",
  "murder", "murder you",
  "die", "die now", "go die",
  "burn alive", "burn you", "burn them",
  "shoot", "shoot you", "shoot them",
  "stab", "stab you",
  "hang yourself", "hang him",
  "cut your throat",
  "beat to death",
  "torture", "torture you",

  //  viết tắt / biến thể
  "kill u", "kys", "die mf", "die bitch",
  "k!ll", "k1ll", "k!ll you",
  "sh00t", "st@b", "murd3r"
];

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

    }
  }

  // Add remaining safe text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isProfane: false });
  }


  return segments;
};
