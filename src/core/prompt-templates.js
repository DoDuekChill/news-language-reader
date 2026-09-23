export function buildBriefPrompt({ title, firstParagraph, sourceLang }) {
  return `You are a linguistic analyzer. Read this news headline and first paragraph in language "${sourceLang}".
Output a 1-sentence topic brief describing: domain, main subject, and formality tone.
Do not use emojis. Output in Korean.

Title: ${title}
Context: ${firstParagraph}
Topic Brief:`;
}

export function buildSentencePrompt({ sentence, words, brief, previousContext, sourceLang, targetLangs }) {
  return `Translate the given sentence from "${sourceLang}" into ${targetLangs.join(' and ')} and provide word-level alignments.
Output strictly valid JSON with no markdown backticks, no emoticons.

[Article Topic Brief]
${brief || 'General news report'}

[Previous Context]
${previousContext || 'None'}

[Target Sentence]
${sentence}

[Target Words to Align]
${words.join(', ')}

Output JSON Schema:
{
  "translation_ko": "Korean translation",
  "translation_en": "English translation",
  "alignments": [
    {
      "src_word": "exact word token from target sentence",
      "target_ko": "matching Korean word",
      "target_en": "matching English word",
      "base_form": "dictionary base lemma form",
      "reading": "pronunciation or phonetic reading if applicable",
      "pos": "part of speech",
      "nuance": "native cultural nuance, formality, practical usage note without emoticons"
    }
  ]
}`;
}
