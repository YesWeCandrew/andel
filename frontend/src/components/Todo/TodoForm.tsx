import { useState } from 'react'
import type { FormEvent } from 'react'
import { Xmark } from 'iconoir-react'
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../../api/todos'
import styles from './TodoForm.module.css'

const FREQUENCY_PRESETS = [1, 2, 5, 7, 14]

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

interface TodoFormProps {
  /** Omit (or pass null) to create a new todo; pass a todo to edit it. */
  initialTodo?: Todo | null
  onSubmit: (input: CreateTodoInput | UpdateTodoInput) => Promise<void> | void
  onCancel: () => void
  submitting?: boolean
  error?: string | null
}

export function TodoForm({ initialTodo, onSubmit, onCancel, submitting = false, error = null }: TodoFormProps) {
  const isEditing = Boolean(initialTodo)

  const [title, setTitle] = useState(initialTodo?.title ?? '')
  const [emoji, setEmoji] = useState(initialTodo?.emoji ?? '')
  const [notes, setNotes] = useState(initialTodo?.notes ?? '')
  const [startOn, setStartOn] = useState(todayIsoDate())
  const [repeats, setRepeats] = useState(Boolean(initialTodo?.frequency_days))
  const [frequencyDays, setFrequencyDays] = useState(initialTodo?.frequency_days ?? 7)
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Give it a title')
      return
    }

    const trimmedEmoji = emoji.trim()
    const trimmedNotes = notes.trim()

    if (isEditing) {
      const input: UpdateTodoInput = {
        title: trimmedTitle,
        emoji: trimmedEmoji || undefined,
        notes: trimmedNotes || undefined,
        frequency_days: repeats ? frequencyDays : undefined,
      }
      onSubmit(input)
      return
    }

    const input: CreateTodoInput = {
      title: trimmedTitle,
      emoji: trimmedEmoji || undefined,
      notes: trimmedNotes || undefined,
      frequency_days: repeats ? frequencyDays : undefined,
      start_on: startOn,
    }
    onSubmit(input)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>{isEditing ? 'Edit to do' : 'New to do'}</h2>
        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
          <Xmark width={16} height={16} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="todo-title">
          Title
        </label>
        <input
          id="todo-title"
          className={styles.input}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (titleError) setTitleError(null)
          }}
          placeholder="e.g. Sweep the kitchen"
          autoFocus
        />
        {titleError && <p className={styles.error}>{titleError}</p>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="todo-emoji">
            Emoji
          </label>
          <input
            id="todo-emoji"
            className={styles.emojiInput}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder="🧹"
          />
        </div>

        {!isEditing && (
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label} htmlFor="todo-start">
              Start
            </label>
            <input
              id="todo-start"
              type="date"
              className={styles.input}
              value={startOn}
              onChange={(e) => setStartOn(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="todo-notes">
          Notes
        </label>
        <textarea
          id="todo-notes"
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          rows={3}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Repeat</span>
        <div className={styles.repeatRow}>
          <div className={styles.chipGroup}>
            <button
              type="button"
              className={`${styles.chip} ${!repeats ? styles.chipActive : ''}`}
              onClick={() => setRepeats(false)}
            >
              One-off
            </button>
            <button
              type="button"
              className={`${styles.chip} ${repeats ? styles.chipActive : ''}`}
              onClick={() => setRepeats(true)}
            >
              Repeats
            </button>
          </div>

          {repeats && (
            <>
              <span className={styles.repeatText}>every</span>
              <div className={styles.chipGroup}>
                {FREQUENCY_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.chip} ${frequencyDays === n ? styles.chipActive : ''}`}
                    onClick={() => setFrequencyDays(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                className={styles.numberInput}
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(Math.max(1, Number(e.target.value) || 1))}
              />
              <span className={styles.repeatText}>days</span>
            </>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={`button button-primary ${styles.submitButton}`} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
