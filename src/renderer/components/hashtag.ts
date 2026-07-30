export function getHashtagName(text: string): string | null {
  const hashtag = text.trim().replace(/^#/, '').trim();
  return hashtag.length > 0 ? hashtag : null;
}
