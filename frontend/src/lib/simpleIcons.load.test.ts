import { expect, test, vi } from 'vitest'
import { loadSimpleIcons } from './simpleIcons.ts'

const { attempts } = vi.hoisted(() => ({ attempts: { count: 0 } }))

// First load fails (e.g. offline), the next one succeeds.
vi.mock('simple-icons', () => {
  attempts.count += 1
  if (attempts.count === 1) throw new Error('offline')
  return { siGit: { title: 'Git', slug: 'git', hex: 'F05032', path: 'M0 0z' } }
})

test('a failed load is not remembered: the next call tries again', async () => {
  await expect(loadSimpleIcons()).rejects.toThrow()
  await expect(loadSimpleIcons()).resolves.toEqual([
    { title: 'Git', slug: 'git', hex: 'F05032', path: 'M0 0z' },
  ])
})
