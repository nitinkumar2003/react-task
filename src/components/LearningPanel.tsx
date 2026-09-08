import { useState } from 'react'
import type { LearningContent } from '../tasks/learning-types'
import styles from './LearningPanel.module.css'

interface LearningPanelProps {
  content: LearningContent
}

export default function LearningPanel({ content }: LearningPanelProps) {
  const { summary, concepts, codeSnippets, interviewQuestions } = content
  const isEmpty =
    concepts.length === 0 &&
    codeSnippets.length === 0 &&
    interviewQuestions.length === 0

  return (
    <div className={styles.wrapper}>
      <p className={styles.summary}>{summary}</p>

      {!isEmpty && (
        <>
          <section className={styles.section}>
            <h3 className={styles.heading}>Concepts used</h3>
            <ul className={styles.chipList}>
              {concepts.map((c) => (
                <li key={c} className={styles.chip}>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          {codeSnippets.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.heading}>Code worth remembering</h3>
              <div className={styles.snippetList}>
                {codeSnippets.map((snippet) => (
                  <div key={snippet.title} className={styles.snippet}>
                    <p className={styles.snippetTitle}>{snippet.title}</p>
                    <pre className={styles.codeBlock}>
                      <code>{snippet.code}</code>
                    </pre>
                    <p className={styles.snippetExplanation}>
                      {snippet.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {interviewQuestions.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.heading}>
                Interview questions this preps you for
              </h3>
              <InterviewAccordion items={interviewQuestions} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

interface InterviewAccordionProps {
  items: LearningContent['interviewQuestions']
}

function InterviewAccordion({ items }: InterviewAccordionProps) {
  // multiple entries can be open at once — reading two related answers
  // side by side is normal while revising, no reason to force single-open
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set())

  const toggle = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className={styles.accordion}>
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index)
        return (
          <div key={item.question} className={styles.accordionItem}>
            <button
              type="button"
              className={styles.accordionTrigger}
              aria-expanded={isOpen}
              onClick={() => toggle(index)}
            >
              <span
                className={
                  isOpen ? styles.accordionIconOpen : styles.accordionIcon
                }
                aria-hidden="true"
              >
                ▸
              </span>
              <span>{item.question}</span>
            </button>
            {isOpen && (
              <p className={styles.accordionAnswer}>{item.answer}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
