import { createRestAPIClient } from 'masto';
import type { PostVisibility, UploadedMedia } from '../shared/types.ts';

export async function createStatus(
  serverUrl: string,
  accessToken: string,
  status: string,
  visibility: PostVisibility,
  inReplyToId?: string,
  mediaIds?: string[],
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });

  if (mediaIds && mediaIds.length > 0) {
    await client.v1.statuses.create({
      status: status.trim().length > 0 ? status : null,
      visibility,
      inReplyToId,
      mediaIds,
    });
    return;
  }

  await client.v1.statuses.create({ status, visibility, inReplyToId });
}

export async function uploadMedia(
  serverUrl: string,
  accessToken: string,
  fileName: string,
  mimeType: string,
  data: Uint8Array,
): Promise<UploadedMedia> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  const file = new Blob([data], { type: mimeType || 'application/octet-stream' });
  const uploaded = await client.v2.media.create({
    file,
    description: fileName,
  });

  return {
    id: uploaded.id,
    previewUrl: uploaded.previewUrl ?? uploaded.url ?? '',
    url: uploaded.url ?? uploaded.previewUrl ?? '',
  };
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
