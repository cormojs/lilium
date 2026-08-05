export function getHashtagName(text: string): string | null {
  const trimmedText = text.trim();
  if (!trimmedText.startsWith('#')) {
    return null;
  }

  const hashtag = trimmedText.slice(1).trim();
  return hashtag.length > 0 ? hashtag : null;
}

export function getHashtagNameFromLink(
  text: string,
  href: string,
  className: string,
): string | null {
  const hashtag = getHashtagName(text);
  if (!hashtag) {
    return null;
  }

  if (className.split(/\s+/).includes('hashtag')) {
    return hashtag;
  }

  try {
    return new URL(href).pathname.startsWith('/tags/') ? hashtag : null;
  } catch {
    return null;
  }
}
