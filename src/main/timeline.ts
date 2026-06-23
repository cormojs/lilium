import { createRestAPIClient } from 'masto';
import type { mastodon } from 'masto';
import type {
  AccountProfile,
  AccountRelationshipSummary,
  AccountSuggestion,
  TimelineType,
  Post,
} from '../shared/types.ts';
import { convertAccount, convertStatus } from './mastodonConverters.ts';

export async function fetchTimeline(
  serverUrl: string,
  accessToken: string,
  type: TimelineType,
  accountId?: string,
  maxId?: string,
): Promise<Post[]> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });

  const params = { maxId, limit: 20 };

  let statuses;
  switch (type) {
    case 'home':
      statuses = await client.v1.timelines.home.list(params);
      break;
    case 'public':
      statuses = await client.v1.timelines.public.list(params);
      break;
    case 'local':
      statuses = await client.v1.timelines.public.list({ ...params, local: true });
      break;
    case 'favourites':
      statuses = await client.v1.favourites.list(params);
      break;
    case 'account':
      if (!accountId) {
        throw new Error('アカウントTLの取得にはアカウントIDが必要です');
      }
      statuses = await client.v1.accounts.$select(accountId).statuses.list(params);
      break;
    case 'notifications':
      return [];
  }

  return statuses.map(convertStatus);
}

export async function fetchAccountProfile(
  serverUrl: string,
  accessToken: string,
  accountId: string,
): Promise<AccountProfile> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const account = await client.v1.accounts.$select(accountId).fetch();
  const profile = convertAccount(account);
  const relationships = await client.v1.accounts.relationships.fetch({ id: [accountId] });
  const relationshipSummary = relationships[0];
  if (relationshipSummary) {
    profile.following = relationshipSummary.following;
    profile.requested = relationshipSummary.requested;
  }

  return profile;
}

export async function fetchAccountRelationship(
  serverUrl: string,
  accessToken: string,
  accountId: string,
): Promise<AccountRelationshipSummary> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const relationships = await client.v1.accounts.relationships.fetch({ id: [accountId] });
  const relationship = relationships[0];
  if (!relationship) {
    return { following: false, requested: false };
  }
  return {
    following: relationship.following,
    requested: relationship.requested,
  };
}

function toAccountSuggestion(account: mastodon.v1.Account): AccountSuggestion {
  return {
    id: account.id,
    acct: account.acct,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatar,
  };
}

function accountMatchesQuery(account: AccountSuggestion, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return (
    account.acct.toLowerCase().includes(normalizedQuery) ||
    account.username.toLowerCase().includes(normalizedQuery) ||
    account.displayName.toLowerCase().includes(normalizedQuery)
  );
}

function compareAccountSuggestions(query: string) {
  const normalizedQuery = query.toLowerCase();
  return (a: AccountSuggestion, b: AccountSuggestion): number => {
    const aStartsWith =
      normalizedQuery.length > 0 &&
      (a.acct.toLowerCase().startsWith(normalizedQuery) ||
        a.username.toLowerCase().startsWith(normalizedQuery));
    const bStartsWith =
      normalizedQuery.length > 0 &&
      (b.acct.toLowerCase().startsWith(normalizedQuery) ||
        b.username.toLowerCase().startsWith(normalizedQuery));

    if (aStartsWith !== bStartsWith) {
      return aStartsWith ? -1 : 1;
    }

    return a.acct.localeCompare(b.acct);
  };
}

export async function fetchAccountSuggestions(
  serverUrl: string,
  accessToken: string,
  query: string,
): Promise<AccountSuggestion[]> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const me = await client.v1.accounts.verifyCredentials();
  const [following, followers] = await Promise.all([
    client.v1.accounts.$select(me.id).following.list({ limit: 80 }),
    client.v1.accounts.$select(me.id).followers.list({ limit: 80 }),
  ]);

  const suggestions = new Map<string, AccountSuggestion>();
  for (const account of [...following, ...followers]) {
    suggestions.set(account.id, toAccountSuggestion(account));
  }

  return [...suggestions.values()]
    .filter((account) => accountMatchesQuery(account, query.trim()))
    .sort(compareAccountSuggestions(query.trim()))
    .slice(0, 8);
}

export async function followAccount(
  serverUrl: string,
  accessToken: string,
  accountId: string,
): Promise<AccountRelationshipSummary> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const relationship = await client.v1.accounts.$select(accountId).follow({});
  return {
    following: relationship.following,
    requested: relationship.requested,
  };
}

export async function unfollowAccount(
  serverUrl: string,
  accessToken: string,
  accountId: string,
): Promise<AccountRelationshipSummary> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const relationship = await client.v1.accounts.$select(accountId).unfollow({});
  return {
    following: relationship.following,
    requested: relationship.requested,
  };
}
