import { useState } from 'react'
import { NavArrowDown } from 'iconoir-react'
import type { Unit } from '../../api/shoppingList'
import styles from './UnitSelect.module.css'

const ADD_NEW = '__add_new__'

interface UnitSelectProps {
  value: string
  /** Existing units, in the order they should be offered (most used first). */
  units: Unit[]
  onChange: (unit: string) => void
  /** Field styling for the select / text input, supplied by the form. */
  className?: string
  id?: string
}

// A native <select> of known units (so phones show their own picker), with a
// blank "piece" option first and an "Add new unit…" option last that swaps in
// a text input. New units are created by the backend when the item is saved.
export function UnitSelect({ value, units, onChange, className, id }: UnitSelectProps) {
  const [adding, setAdding] = useState(false)
  const [previous, setPrevious] = useState(value)

  // A unit literally named "piece" is shown as the blank option, which already means piece.
  const isPiece = (name: string) => name.toLowerCase() === 'piece'
  const known = units.map((u) => u.unit ?? '').filter((u) => u && !isPiece(u))
  const findKnown = (name: string) => known.find((u) => u.toLowerCase() === name.toLowerCase())
  const selected = isPiece(value) ? '' : value
  // Keep a just-typed (or since-deactivated) unit selectable until it's saved.
  const options = selected && !findKnown(selected) ? [selected, ...known] : known

  function finishAdding() {
    const trimmed = value.trim()
    onChange(trimmed ? findKnown(trimmed) ?? trimmed : previous)
    setAdding(false)
  }

  if (adding) {
    return (
      <div className={styles.wrapper}>
        <input
          id={id}
          className={className}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={finishAdding}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              onChange(previous)
              setAdding(false)
            }
          }}
          placeholder="New unit"
          autoComplete="off"
          autoFocus
          aria-label="New unit"
        />
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <select
        id={id}
        className={`${className ?? ''} ${styles.select}`}
        value={selected}
        onChange={(event) => {
          if (event.target.value === ADD_NEW) {
            setPrevious(value)
            onChange('')
            setAdding(true)
          } else {
            onChange(event.target.value)
          }
        }}
        aria-label="Unit"
      >
        <option value="">piece</option>
        {options.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value={ADD_NEW}>Add new unit…</option>
      </select>
      <NavArrowDown className={styles.chevron} width={16} height={16} strokeWidth={2} />
    </div>
  )
}
