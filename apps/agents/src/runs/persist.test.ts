import { describe, expect, it } from 'vitest'

import type { Database } from '@repo/db'

import { createRunStore } from './persist'

type StoryRow = {
  projectId: string
  title: string
}

// Writes on the transaction draft commit only if the callback finishes
function fakeStoriesDb() {
  let committed: StoryRow[] = []
  let failInsert = false

  function writer(rows: StoryRow[]) {
    return {
      delete() {
        return {
          where() {
            rows.splice(0, rows.length)
            return Promise.resolve()
          },
        }
      },
      insert() {
        return {
          values(next: StoryRow[]) {
            if (failInsert) {
              throw new Error('insert failed')
            }

            rows.push(
              ...next.map((row) => ({
                projectId: row.projectId,
                title: row.title,
              }))
            )
            return Promise.resolve()
          },
        }
      },
    }
  }

  return {
    titles() {
      return committed.map((row) => row.title)
    },
    seed(projectId: string, title: string) {
      committed.push({ projectId, title })
    },
    failInserts() {
      failInsert = true
    },
    delete() {
      return writer(committed).delete()
    },
    insert() {
      return writer(committed).insert()
    },
    async transaction(
      run: (transaction: ReturnType<typeof writer>) => Promise<void>
    ) {
      const draft = committed.map((row) => ({ ...row }))
      await run(writer(draft))
      committed = draft
    },
  }
}

describe('saveKanbanStories', () => {
  it('keeps the old stories when the insert throws', async () => {
    const db = fakeStoriesDb()
    db.seed('project-1', 'Old card')
    db.failInserts()

    const store = createRunStore(db as unknown as Database)

    await expect(
      store.saveKanbanStories('project-1', {
        cards: [
          { title: 'Book a walk', description: '' },
          { title: 'Pay online', description: '' },
          { title: 'Leave a review', description: '' },
        ],
      })
    ).rejects.toThrow('insert failed')

    expect(db.titles()).toEqual(['Old card'])
  })
})
