import { createRestAPIClient } from 'masto';
import type { PostVisibility } from '../shared/types.ts';

export async function createStatus(
  serverUrl: string,
  accessToken: string,
  status: string,
  visibility: PostVisibility,
  inReplyToId?: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.create({ status, visibility, inReplyToId });
}

export async function favouriteStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).favourite();
}

export async function unfavouriteStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).unfavourite();
}

export async function reblogStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).reblog();
}

export async function unreblogStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).unreblog();
}

export async function bookmarkStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).bookmark();
}

export async function unbookmarkStatus(
  serverUrl: string,
  accessToken: string,
  statusId: string,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.$select(statusId).unbookmark();
}
