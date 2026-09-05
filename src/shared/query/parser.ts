export type QueryNode =
  | { type: 'Call'; name: string; args: QueryNode[] }
  | { type: 'Keyword' | 'Field' | 'String'; value: string };

export interface QueryToken {
  type: 'open' | 'close' | 'symbol' | 'keyword' | 'field' | 'string';
  value: string;
  position: number;
}

/** A bounded lexer: queries are user input, never JavaScript source. */
export function tokenizeQuery(source: string): QueryToken[] {
  if (source.length > 10000) throw new Error('クエリは10000文字以内にしてください');
  const tokens: QueryToken[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (!char) break;
    if (/\s/u.test(char)) {
      i++;
      continue;
    }
    const position = i;
    if (char === '(' || char === ')') {
      tokens.push({ type: char === '(' ? 'open' : 'close', value: char, position });
      i++;
      continue;
    }
    if (char === '"') {
      i++;
      let value = '';
      let closed = false;
      while (i < source.length) {
        const next = source[i++];
        if (next === '"') {
          closed = true;
          break;
        }
        if (next === '\\') {
          const escaped = source[i++];
          switch (escaped) {
            case '"':
            case '\\':
              value += escaped;
              break;
            case 'n':
              value += '\n';
              break;
            case 'r':
              value += '\r';
              break;
            case 't':
              value += '\t';
              break;
            default:
              throw new Error(`${String(i)}文字目: 不正なエスケープです`);
          }
        } else {
          value += next ?? '';
        }
      }
      if (!closed) throw new Error(`${String(position + 1)}文字目: 文字列が閉じられていません`);
      tokens.push({ type: 'string', value, position });
      continue;
    }
    while (i < source.length && !/[\s()"]/u.test(source[i] ?? '')) i++;
    const atom = source.slice(position, i);
    const type = atom.startsWith(':') ? 'keyword' : atom.startsWith('.') ? 'field' : 'symbol';
    const value = type === 'symbol' ? atom : atom.slice(1);
    if (!/^[a-zA-Z_][a-zA-Z0-9_?!-]*$/u.test(value)) {
      throw new Error(`${String(position + 1)}文字目: 不正な名前です`);
    }
    tokens.push({ type, value, position });
  }
  return tokens;
}

export function parseQuery(source: string): QueryNode {
  const tokens = tokenizeQuery(source);
  let cursor = 0;
  function read(depth: number): QueryNode {
    if (depth > 64) throw new Error('クエリの入れ子が深すぎます');
    const token = tokens[cursor++];
    if (!token) throw new Error('式が途中で終わっています');
    if (token.type === 'open') {
      const name = tokens[cursor++];
      if (name?.type !== 'symbol') throw new Error('開き括弧の後には関数名が必要です');
      const args: QueryNode[] = [];
      while (tokens[cursor]?.type !== 'close') {
        if (!tokens[cursor]) throw new Error('閉じ括弧がありません');
        args.push(read(depth + 1));
      }
      cursor++;
      return { type: 'Call', name: name.value, args };
    }
    switch (token.type) {
      case 'keyword':
        return { type: 'Keyword', value: token.value };
      case 'field':
        return { type: 'Field', value: token.value };
      case 'string':
        return { type: 'String', value: token.value };
      default:
        throw new Error(`${String(token.position + 1)}文字目: 予期しないトークンです`);
    }
  }
  const node = read(0);
  if (cursor !== tokens.length) throw new Error('クエリには式を1つだけ指定してください');
  return node;
}
