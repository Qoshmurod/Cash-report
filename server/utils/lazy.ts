import { createRequire } from 'node:module'

// Heavy parsers are loaded on first use (keeps idle memory low) and resolved from
// .output/server/node_modules at runtime instead of being bundled with build-machine paths.
const nodeRequire = createRequire(import.meta.url)

export const loadXlsx = () => nodeRequire('xlsx') as typeof import('xlsx')
export const loadMammoth = () => nodeRequire('mammoth') as typeof import('mammoth')
