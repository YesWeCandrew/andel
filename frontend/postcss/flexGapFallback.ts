import type { AtRule, Container, Plugin, Rule } from 'postcss'

/**
 * Flex `gap` only arrived in Safari 14.1, so on older iPads (Safari 12) every
 * flex container collapses its spacing to nothing. There's no feature query for
 * flex-gap specifically (`@supports (gap: 0)` passes thanks to grid), so this
 * gates on `inset`, which shipped in the same Safari release.
 *
 * For every flex container that declares `gap`, a margin-based equivalent is
 * appended to the end of the file inside `@supports not (inset: 0)`:
 *   - column:    `> * + *` gets margin-top
 *   - row:       `> * + *` gets margin-left (plus an icon-before-text fix, see below)
 *   - row+wrap:  every child gets margin-right/bottom, cancelled by a negative
 *                margin on the container
 * Appending at the end means the fallback beats same-file `margin: 0` resets on
 * children, so any `auto` margins in the file (used to push items apart) are
 * re-declared after it to keep them working.
 */

const SUPPORTS_GATE = 'not (inset: 0)'

interface FlexProps {
  display?: string
  direction?: string
  wrap?: string
  gap?: string
}

const PROP_KEYS: Record<string, keyof FlexProps> = {
  display: 'display',
  'flex-direction': 'direction',
  'flex-wrap': 'wrap',
  gap: 'gap',
}

function readFlexProps(rule: Rule): FlexProps {
  const props: FlexProps = {}
  rule.each((node) => {
    if (node.type === 'decl' && PROP_KEYS[node.prop]) props[PROP_KEYS[node.prop]] = node.value
  })
  return props
}

/** Splits a `gap` value into row/column parts, ignoring spaces inside parentheses. */
function splitGap(value: string): [string, string] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of value.trim()) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ' ' && depth === 0) {
      if (current) parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) parts.push(current)
  return [parts[0], parts[1] ?? parts[0]]
}

function mediaParent(rule: Rule): AtRule | undefined {
  const parent = rule.parent
  return parent?.type === 'atrule' && (parent as AtRule).name === 'media' ? (parent as AtRule) : undefined
}

export function flexGapFallback(): Plugin {
  return {
    postcssPlugin: 'flex-gap-fallback',
    OnceExit(root, { AtRule, Rule }) {
      // Merge flex props from top-level rules so media-query overrides (which
      // often only change `gap` or `flex-direction`) can see the full picture.
      const base = new Map<string, FlexProps>()
      root.each((node) => {
        if (node.type !== 'rule') return
        for (const selector of node.selectors) {
          base.set(selector, { ...base.get(selector), ...readFlexProps(node) })
        }
      })

      // One output block per context: '' for top level, else the media params.
      const fallbacks = new Map<string, Rule[]>()
      const autoMargins = new Map<string, Rule[]>()
      const push = (map: Map<string, Rule[]>, key: string, rule: Rule) => {
        map.set(key, [...(map.get(key) ?? []), rule])
      }

      root.walkRules((rule) => {
        const media = mediaParent(rule)
        if (rule.parent !== root && !media) return
        const context = media?.params ?? ''

        const autoDecls = rule.nodes.filter(
          (node) => node.type === 'decl' && node.prop.startsWith('margin') && /\bauto\b/.test(node.value),
        )
        if (autoDecls.length > 0) {
          push(autoMargins, context, new Rule({ selector: rule.selector, nodes: autoDecls.map((d) => d.clone()) }))
        }

        const own = readFlexProps(rule)
        if (!own.gap && !own.direction && !own.wrap && !own.display) return

        for (const selector of rule.selectors) {
          const props = media ? { ...base.get(selector), ...own } : base.get(selector)!
          if (!props.gap || !/^(inline-)?flex$/.test(props.display ?? '')) continue

          const [rowGap, colGap] = splitGap(props.gap)
          const isColumn = props.direction?.startsWith('column') ?? false
          const wraps = !isColumn && props.wrap !== undefined && props.wrap !== 'nowrap'

          if (wraps) {
            push(fallbacks, context, new Rule({ selector, nodes: [] }).append(
              { prop: 'margin-right', value: `calc(-1 * ${colGap})` },
              { prop: 'margin-bottom', value: `calc(-1 * ${rowGap})` },
            ))
            push(fallbacks, context, new Rule({ selector: `${selector} > *`, nodes: [] }).append(
              { prop: 'margin-right', value: colGap },
              { prop: 'margin-bottom', value: rowGap },
            ))
            continue
          }

          // Inside a media query the direction may have flipped from the base
          // rule, so clear the other axis explicitly.
          const sibling = new Rule({ selector: `${selector} > * + *`, nodes: [] })
          sibling.append({ prop: isColumn ? 'margin-top' : 'margin-left', value: isColumn ? rowGap : colGap })
          if (media) sibling.append({ prop: isColumn ? 'margin-left' : 'margin-top', value: '0' })
          push(fallbacks, context, sibling)

          if (!isColumn) {
            // Buttons like `<Plus /> New` have a single element child followed
            // by a text node, which `* + *` can't reach.
            push(fallbacks, context, new Rule({ selector: `${selector} > svg:only-child`, nodes: [] }).append(
              { prop: 'margin-right', value: colGap },
            ))
          }
        }
      })

      if (fallbacks.size === 0) return

      const appendContext = (context: string, rules: Rule[]) => {
        const supports = new AtRule({ name: 'supports', params: SUPPORTS_GATE })
        supports.append(...rules)
        const wrapper: Container = context ? new AtRule({ name: 'media', params: context }) : root
        if (wrapper !== root) root.append(wrapper)
        wrapper.append(supports)
      }

      // Top level first so media-query fallbacks override it, then auto margins last.
      const ordered = (map: Map<string, Rule[]>) =>
        [...map.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : 0))
      for (const [context, rules] of ordered(fallbacks)) appendContext(context, rules)
      for (const [context, rules] of ordered(autoMargins)) appendContext(context, rules)
    },
  }
}
