import type { PostCustomEmoji } from '../../shared/types.ts';

const CUSTOM_EMOJI_PATTERN = /:([a-zA-Z0-9_]+):/g;

function pickEmojiUrl(emoji: PostCustomEmoji): string | null {
  if (emoji.url.trim().length > 0) {
    return emoji.url;
  }

  if (emoji.staticUrl.trim().length > 0) {
    return emoji.staticUrl;
  }

  return null;
}

export function replaceCustomEmojis(html: string, emojis: PostCustomEmoji[]): string {
  if (html.length === 0 || emojis.length === 0) {
    return html;
  }

  const emojiMap = new Map<string, string>();
  for (const emoji of emojis) {
    const url = pickEmojiUrl(emoji);
    if (!url) {
      continue;
    }

    emojiMap.set(emoji.shortcode, url);
  }

  if (emojiMap.size === 0) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const sourceText = textNode.textContent ?? '';

    CUSTOM_EMOJI_PATTERN.lastIndex = 0;
    if (!CUSTOM_EMOJI_PATTERN.test(sourceText)) {
      currentNode = walker.nextNode();
      continue;
    }

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;

    CUSTOM_EMOJI_PATTERN.lastIndex = 0;
    for (const match of sourceText.matchAll(CUSTOM_EMOJI_PATTERN)) {
      const shortcode = match[1];
      const matchedText = match[0];
      const startIndex = match.index;
      if (startIndex === undefined) {
        continue;
      }

      if (startIndex > lastIndex) {
        fragment.append(sourceText.slice(lastIndex, startIndex));
      }

      if (!shortcode) {
        fragment.append(matchedText);
        lastIndex = startIndex + matchedText.length;
        continue;
      }

      const emojiUrl = emojiMap.get(shortcode);
      if (!emojiUrl) {
        fragment.append(matchedText);
      } else {
        const emojiImage = doc.createElement('img');
        emojiImage.src = emojiUrl;
        emojiImage.alt = matchedText;
        emojiImage.title = matchedText;
        emojiImage.className = 'custom-emoji';
        fragment.append(emojiImage);
      }

      lastIndex = startIndex + matchedText.length;
    }

    if (lastIndex < sourceText.length) {
      fragment.append(sourceText.slice(lastIndex));
    }

    textNode.replaceWith(fragment);
    currentNode = walker.nextNode();
  }

  return doc.body.innerHTML;
}
