#!/usr/bin/env node

import * as url from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import Fuse from 'fuse.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const searchOptions = {
  minMatchCharLength: 3,
  includeScore: true,
  shouldSort: true,
}
const MAX_RESULTS_AMOUNT = 6

function createDictionary() {
  let enToDe = {}
  let deToEn = {}
  let deFuse = null
  let enFuse = null
  return {
    async load() {
      const dictPath = path.resolve(__dirname, './dict')
      enToDe = JSON.parse(await fs.readFile(path.join(dictPath, 'en-de.json'), { encoding: 'utf-8' }))
      deToEn = JSON.parse(await fs.readFile(path.join(dictPath, 'de-en.json'), { encoding: 'utf-8' }))

      enFuse = new Fuse(Object.keys(enToDe), searchOptions)
      deFuse = new Fuse(Object.keys(deToEn), searchOptions)

    },
    query(word, lang) {
      const fuse = lang === 'de' ? deFuse : enFuse
      const dict = lang === 'de' ? deToEn : enToDe
      const results = fuse.search(word).slice(0, MAX_RESULTS_AMOUNT)
      const matchedWords = results.map(result => result.item)

      const translations = matchedWords.map(matched => ({
        matched,
        translation: dict[matched],
        exact: word === matched.toLowerCase(),
      }))
      return translations
    }
  }
}

const langsName = {
  de: 'German',
  en: 'English'
}

const Effect_underscore = '\x1b[4m'

async function main() {
  const dict = createDictionary()
  await dict.load()
  const [,, word, lang = 'de'] = process.argv
  console.log(`Query "${word}" in ${langsName[lang]}...\n`)
  const translations = await dict.query(word, lang)

  translations.forEach(({ exact, matched, translation }) => {
    const matchedColor = exact ? Effect_underscore : ''

    console.log(`${matchedColor}%s\x1b[0m`, `${matched}`, `${translation}${''}`)
  })
}

await main()
