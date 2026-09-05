import { z } from 'zod';

const baseTabSchema = z.object({
  id: z.string(),
  accountServerUrl: z.string(),
  accountUsername: z.string(),
  customName: z.string().optional(),
});

export const tabDefinitionSchema = z.discriminatedUnion('timelineType', [
  baseTabSchema.extend({
    timelineType: z.enum(['home', 'public', 'local', 'favourites', 'notifications']),
  }),
  baseTabSchema.extend({
    timelineType: z.literal('account'),
    targetAccountId: z.string().min(1),
    targetAccountAcct: z.string().optional(),
  }),
  baseTabSchema.extend({
    timelineType: z.literal('context'),
    targetStatusId: z.string().min(1),
  }),
  baseTabSchema.extend({
    timelineType: z.literal('hashtag'),
    targetHashtag: z.string().min(1),
  }),
  baseTabSchema.extend({
    timelineType: z.literal('query'),
    query: z.string().min(1).max(10000),
  }),
]);

export type TabDefinition = z.infer<typeof tabDefinitionSchema>;
export type QueryTabDefinition = Extract<TabDefinition, { timelineType: 'query' }>;
export type TimelineTabDefinition = Exclude<TabDefinition, QueryTabDefinition>;

/** Read query tabs saved before query became its own timelineType. */
export const savedTabDefinitionSchema = z.preprocess((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'timelineType' in value &&
    value.timelineType === 'home' &&
    'query' in value &&
    typeof value.query === 'string'
  ) {
    return { ...value, timelineType: 'query' };
  }
  return value;
}, tabDefinitionSchema);
