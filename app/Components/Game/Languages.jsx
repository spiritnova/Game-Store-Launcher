'use client'

import { useState } from 'react'
import styles from './GameInfo.module.css'

const VISIBLE = 8

export default function Languages({ languages }) {
  const [expanded, setExpanded] = useState(false)
  const audio = new Set(languages.audio)
  const rows = expanded ? languages.interface : languages.interface.slice(0, VISIBLE)
  const hidden = languages.interface.length - VISIBLE

  return (
    <section aria-labelledby="languages-title">
      <h2 id="languages-title" className={styles.title}>
        Languages <span className={styles.count}>{languages.interface.length} supported</span>
      </h2>
      <table id="languages-table" className={styles.languages}>
        <thead>
          <tr>
            <th scope="col">Language</th>
            <th scope="col">Interface &amp; subtitles</th>
            <th scope="col">Full audio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((language) => (
            <tr key={language}>
              <th scope="row">{language}</th>
              <td>✓</td>
              <td>{audio.has(language) ? '✓' : <span className="visually-hidden">No</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls="languages-table"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer languages' : `Show ${hidden} more languages`}
        </button>
      )}
    </section>
  )
}
