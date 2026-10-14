import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Bone, Loading } from './Skeleton.tsx'

afterEach(() => vi.useRealTimers())

test('tells screen readers at once, shows the shape only when loading lasts', () => {
  vi.useFakeTimers()
  const { container } = render(
    <Loading label="Loading…">
      <Bone />
    </Loading>,
  )

  expect(screen.getByRole('status').textContent).toBe('Loading…')
  expect(container.querySelector('[aria-hidden="true"]')).toBeNull() // no flash on a fast load

  act(() => vi.advanceTimersByTime(299))
  expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  const skeleton = container.querySelector('[aria-hidden="true"]')
  expect(skeleton?.querySelector('span')).not.toBeNull() // hidden from screen readers
})
