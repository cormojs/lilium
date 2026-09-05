import { Parser } from 'htmlparser2';
import type { Post, StreamType } from '../types.ts';
import { parseQuery, type QueryNode } from './parser.ts';

export type QuerySource = 'home' | 'local' | 'public' | 'favourites';
export interface CompiledQuery {
  sources: QuerySource[];
  matches: (post: Post) => boolean;
  compare: (left: Post, right: Post) => number;
}

export const DEFAULT_QUERY = '(from (tl :home) :where (contains .txt ""))';

export const QUERY_STREAM_TYPES: Record<QuerySource, StreamType | null> = {
  home: 'user',
  local: 'publicLocal',
  public: 'public',
  favourites: null,
};

function call(node: QueryNode | undefined, name: string): Extract<QueryNode, { type: 'Call' }> {
  if (node?.type !== 'Call' || node.name !== name) throw new Error(`${name} 式が必要です`);
  return node;
}

function arity(args: QueryNode[], length: number, name: string): void {
  if (args.length !== length) throw new Error(`${name} の引数は${String(length)}個です`);
}

function sourcesFrom(node: QueryNode | undefined): QuerySource[] {
  if (node?.type === 'Call' && node.name === 'merge') {
    if (node.args.length < 2) throw new Error('merge には2つ以上の取得元が必要です');
    return [...new Set(node.args.flatMap(sourcesFrom))];
  }
  const { args } = call(node, 'tl');
  arity(args, 1, 'tl');
  const type = args[0];
  if (type?.type !== 'Keyword') throw new Error('tl には :home などを指定してください');
  switch (type.value) {
    case 'home':
    case 'local':
    case 'public':
    case 'favourites':
      return [type.value];
    default:
      throw new Error(`未対応のタイムラインです: ${type.value}`);
  }
}

function field(node: QueryNode | undefined): string {
  if (node?.type !== 'Field') throw new Error('フィールドを指定してください');
  if (!['txt', 'media', 'id', 'acct', 'cw'].includes(node.value)) {
    throw new Error(`未対応のフィールドです: .${node.value}`);
  }
  return node.value;
}

function textField(name: string, post: Post): string {
  switch (name) {
    case 'txt': {
      let text = '';
      const parser = new Parser({
        ontext: (value) => {
          text += value;
        },
      });
      parser.end(post.content);
      return text;
    }
    case 'cw':
      return post.spoilerText;
    case 'acct':
      return post.account.acct;
    default:
      return post.id;
  }
}

function predicate(node: QueryNode | undefined): (post: Post) => boolean {
  if (node?.type !== 'Call') throw new Error('条件式が必要です');
  const { name, args } = node;
  switch (name) {
    case 'or':
    case 'and': {
      if (args.length < 2) throw new Error(`${name} には2つ以上の条件が必要です`);
      const predicates = args.map(predicate);
      return name === 'or'
        ? (post) => predicates.some((matches) => matches(post))
        : (post) => predicates.every((matches) => matches(post));
    }
    case 'not': {
      arity(args, 1, name);
      const matches = predicate(args[0]);
      return (post) => !matches(post);
    }
    case 'null?': {
      arity(args, 1, name);
      const key = field(args[0]);
      return key === 'media'
        ? (post) => post.mediaAttachments.length === 0
        : (post) => textField(key, post).length === 0;
    }
    case 'contains': {
      arity(args, 2, name);
      const key = field(args[0]);
      if (key === 'media') throw new Error('contains には文字列フィールドを指定してください');
      const search = args[1];
      if (search?.type !== 'String') throw new Error('contains の第2引数には文字列が必要です');
      return (post) => textField(key, post).includes(search.value);
    }
    default:
      throw new Error(`未対応の条件関数です: ${name}`);
  }
}

/** Compare decimal IDs without precision loss or locale-dependent ordering. */
export function comparePostIds(left: string, right: string): number {
  if (/^\d+$/u.test(left) && /^\d+$/u.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compileQuery(source: string): CompiledQuery {
  const { args } = call(parseQuery(source), 'from');
  const sources = sourcesFrom(args[0]);
  let matches: (post: Post) => boolean = () => true;
  let compare = (a: Post, b: Post): number => comparePostIds(b.id, a.id);
  const seen = new Set<string>();
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i];
    if (key?.type !== 'Keyword' || !['where', 'order'].includes(key.value)) {
      throw new Error('from のオプションには :where または :order を指定してください');
    }
    if (seen.has(key.value)) throw new Error(`:${key.value} が重複しています`);
    seen.add(key.value);
    if (key.value === 'where') {
      matches = predicate(args[i + 1]);
    } else {
      const sort = call(args[i + 1], 'sort');
      if (sort.args.length < 1 || sort.args.length > 2 || field(sort.args[0]) !== 'id') {
        throw new Error('sort には .id と任意の :asc / :desc を指定してください');
      }
      const direction = sort.args[1];
      if (
        direction &&
        (direction.type !== 'Keyword' || !['asc', 'desc'].includes(direction.value))
      ) {
        throw new Error('sort の方向には :asc / :desc を指定してください');
      }
      const descending = direction?.value === 'desc';
      compare = (a, b) => comparePostIds(a.id, b.id) * (descending ? -1 : 1);
    }
  }
  return { sources, matches, compare };
}

export function evaluateQuery(query: CompiledQuery, posts: Post[]): Post[] {
  return [...new Map(posts.map((post) => [post.id, post])).values()]
    .filter(query.matches)
    .sort(query.compare);
}
