import { createRestAPIClient } from 'masto';
import type {
  AccountProfile,
  AccountRelationshipSummary,
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
