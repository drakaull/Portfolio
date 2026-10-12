import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminSkill } from '../../api/adminSkills.ts'
import { mockApi, noContent, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const ICON = { slug: 'python', hex: '3776AB', path: 'M0 0z' }

function skillsApi(initial: AdminSkill[]) {
  let skills = initial
  const fetchMock = mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/skills': () => Response.json(skills),
    'POST /api/admin/skills/2/move': () => {
      // Java (2) moves above Python (1).
      skills = [skills[1], skills[0], ...skills.slice(2)]
      return noContent()
    },
  })
  return fetchMock
}

const SKILLS: AdminSkill[] = [
  { id: 1, name: 'Python', category: 'languages', icon: ICON },
  { id: 2, name: 'Java', category: 'languages', icon: null },
  { id: 3, name: 'Git', category: 'tools', icon: null },
]

const names = (category: string) =>
  within(screen.getByRole('region', { name: category }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

describe('skill list', () => {
  test('groups skills by category, with every category shown', async () => {
    skillsApi(SKILLS)
    renderApp('/en/admin/skills')

    await screen.findByRole('region', { name: 'Languages' })
    expect(names('Languages')).toEqual(['Python▲▼', 'Java▲▼'])
    expect(names('Tools')).toEqual(['Git▲▼'])
    const frontEnd = screen.getByRole('region', { name: 'Front-end' })
    expect(within(frontEnd).getByText('No skill yet.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Python' }).getAttribute('href')).toBe(
      '/en/admin/skills/1',
    )
    expect(screen.getByRole('link', { name: 'New skill' }).getAttribute('href')).toBe(
      '/en/admin/skills/new',
    )
  })

  test('arrows are disabled at the edges of a category', async () => {
    skillsApi(SKILLS)
    renderApp('/en/admin/skills')

    const up = await screen.findByRole('button', { name: 'Move up: Python' })
    expect(up.hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Move down: Python' }).hasAttribute('disabled')).toBe(
      false,
    )
    expect(screen.getByRole('button', { name: 'Move down: Git' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  test('moving reorders the list and keeps the focus on the moved skill', async () => {
    const fetchMock = skillsApi(SKILLS)
    renderApp('/en/admin/skills')

    fireEvent.click(await screen.findByRole('button', { name: 'Move up: Java' }))

    await waitFor(() => expect(names('Languages')).toEqual(['Java▲▼', 'Python▲▼']))
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/skills/2/move')!
    expect(JSON.parse(String(init?.body))).toEqual({ direction: 'up' })
    // Now first: "up" is disabled, so the focus goes to its "down" arrow.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move down: Java' })),
    )
  })
})
