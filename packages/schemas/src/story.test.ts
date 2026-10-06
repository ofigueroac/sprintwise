import { describe, expect, it } from 'vitest';

import { StorySchema } from './story';

const id = '0b1e7c3a-2f4d-4c8e-9a6b-1d2e3f4a5b6c';

describe('StorySchema', () => {
  it('applies defaults for optional fields', () => {
    const story = StorySchema.parse({ id, title: 'Book a dog walk' });

    expect(story).toEqual({
      id,
      title: 'Book a dog walk',
      description: '',
      acceptanceCriteria: [],
      status: 'todo',
      priority: 'medium',
    });
  });

  it('trims the title and rejects blank titles', () => {
    expect(StorySchema.parse({ id, title: '  Pay online  ' }).title).toBe(
      'Pay online'
    );
    expect(StorySchema.safeParse({ id, title: '   ' }).success).toBe(false);
  });

  it('rejects unknown statuses', () => {
    const result = StorySchema.safeParse({ id, title: 'x', status: 'blocked' });

    expect(result.success).toBe(false);
  });
});
