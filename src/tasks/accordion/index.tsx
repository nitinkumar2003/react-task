import { useRef, useState, type KeyboardEvent } from 'react'
import styles from './index.module.css'

interface AccordionItem {
  id: string
  title: string
  content: string
}

const FAQ_ITEMS: AccordionItem[] = [
  {
    id: 'shipping',
    title: 'How long does shipping take?',
    content: 'Orders ship within 1-2 business days and arrive in 3-5 days for standard delivery, or overnight for express.',
  },
  {
    id: 'returns',
    title: 'What is your return policy?',
    content: 'Unused items can be returned within 30 days of delivery for a full refund. Return shipping is free for defective items.',
  },
  {
    id: 'payment',
    title: 'What payment methods do you accept?',
    content: 'We accept all major credit cards, PayPal, and Apple Pay. Payment is charged only when your order ships.',
  },
  {
    id: 'support',
    title: 'How do I contact support?',
    content: 'Reach our support team via the in-app chat, 24/7, or email support@example.com for a response within one business day.',
  },
]

export default function Accordion() {
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([])

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.has(id)
      if (allowMultiple) {
        const next = new Set(prev)
        if (isOpen) next.delete(id)
        else next.add(id)
        return next
      }
      return isOpen ? new Set() : new Set([id])
    })
  }

  const focusHeader = (index: number) => {
    const count = FAQ_ITEMS.length
    headerRefs.current[(index + count) % count]?.focus()
  }

  // no native element gives arrow-key focus movement between headers for free
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusHeader(index + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusHeader(index - 1)
        break
      case 'Home':
        e.preventDefault()
        focusHeader(0)
        break
      case 'End':
        e.preventDefault()
        focusHeader(FAQ_ITEMS.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.modeToggle}>
        <input
          type="checkbox"
          checked={allowMultiple}
          onChange={(e) => {
            setAllowMultiple(e.target.checked)
            setOpenIds(new Set())
          }}
        />
        Allow multiple panels open
      </label>

      <div className={styles.accordion}>
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIds.has(item.id)
          const headerId = `accordion-header-${item.id}`
          const panelId = `accordion-panel-${item.id}`

          return (
            <div key={item.id} className={styles.item}>
              <h3 className={styles.heading}>
                <button
                  type="button"
                  id={headerId}
                  ref={(el) => {
                    headerRefs.current[index] = el
                  }}
                  className={styles.trigger}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  <span className={isOpen ? styles.iconOpen : styles.icon} aria-hidden="true">
                    ▸
                  </span>
                  {item.title}
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className={isOpen ? styles.panelOpen : styles.panel}
              >
                <p className={styles.panelInner}>{item.content}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
