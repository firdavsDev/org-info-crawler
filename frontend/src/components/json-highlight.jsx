// Minimal JSON syntax highlighting: keys, strings, numbers, literals, punctuation.
const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g

const CLASSES = {
  key: "text-sky-700 dark:text-sky-300",
  string: "text-emerald-700 dark:text-emerald-300",
  number: "text-amber-700 dark:text-amber-300",
  literal: "text-violet-700 dark:text-violet-300",
  punctuation: "text-muted-foreground",
}

export function highlightJson(code) {
  const nodes = []
  let last = 0
  let match
  TOKEN.lastIndex = 0
  while ((match = TOKEN.exec(code)) !== null) {
    if (match.index > last) nodes.push(code.slice(last, match.index))
    const [, str, colon, literal, number, punct] = match
    const i = match.index
    if (str !== undefined && colon !== undefined) {
      nodes.push(<span key={i} className={CLASSES.key}>{str}</span>)
      nodes.push(<span key={`${i}:`} className={CLASSES.punctuation}>{colon}</span>)
    } else if (str !== undefined) {
      nodes.push(<span key={i} className={CLASSES.string}>{str}</span>)
    } else if (literal !== undefined) {
      nodes.push(<span key={i} className={CLASSES.literal}>{literal}</span>)
    } else if (number !== undefined) {
      nodes.push(<span key={i} className={CLASSES.number}>{number}</span>)
    } else {
      nodes.push(<span key={i} className={CLASSES.punctuation}>{punct}</span>)
    }
    last = TOKEN.lastIndex
  }
  if (last < code.length) nodes.push(code.slice(last))
  return nodes
}
