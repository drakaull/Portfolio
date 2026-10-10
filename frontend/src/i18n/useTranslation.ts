import { useParams } from 'react-router'
import { en, type TranslationKey } from './en.ts'
import { fr } from './fr.ts'

const dictionaries = { en, fr }

export type Lang = keyof typeof dictionaries

export const DEFAULT_LANG: Lang = 'en'

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && Object.hasOwn(dictionaries, value)
}

/** Reads the language from the `:lang` URL segment, falling back to English. */
export function useTranslation() {
  const { lang: param } = useParams()
  const lang = isLang(param) ? param : DEFAULT_LANG

  return {
    lang,
    t: (key: TranslationKey) => dictionaries[lang][key],
  }
}
