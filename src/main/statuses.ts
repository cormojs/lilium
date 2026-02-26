import { createRestAPIClient } from 'masto';
import type { PostVisibility } from '../shared/types.ts';

export async function createStatus(
  serverUrl: string,
  accessToken: string,
  status: string,
  visibility: PostVisibility,
): Promise<void> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });
  await client.v1.statuses.create({ status, visibility });
}
