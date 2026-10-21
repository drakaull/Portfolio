import type { Experience } from '../api/experiences.ts'

/** Sample timeline entries shared by tests. */
export const ENTRIES: Experience[] = [
  {
    slug: 'icare-student-job-2026',
    kind: 'student_job',
    title: 'Ingénieur R&D',
    organization: 'I-care Group',
    start_year: 2026,
    end_year: 2026,
    summary: 'Stockage hybride chaud/froid.',
    technologies: ['Amazon S3', 'Python', 'NoSQL', 'Docker', 'FastAPI'],
    logo_url: '/api/images/logos/icare-student-job-2026?v=1',
  },
  {
    slug: 'helha-computer-science',
    kind: 'education',
    title: 'Bachelier en informatique',
    organization: 'HELHa',
    start_year: 2023,
    end_year: null,
    summary: 'Développement d’applications.',
    technologies: [],
    logo_url: null,
  },
]
