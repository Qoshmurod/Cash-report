import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Folder shared with deploy/auto-update.sh on the host (bind-mounted in Docker).
const dir = () => process.env.UPDATE_STATE_DIR || (process.env.NODE_ENV === 'production' ? '/app/update-state' : 'deploy/state')

async function readText(name: string) {
  try {
    return await readFile(join(dir(), name), 'utf8')
  } catch {
    return ''
  }
}

const parseEnv = (text: string) => Object.fromEntries(text.split('\n').filter((line) => line.includes('=')).map((line) => {
  const index = line.indexOf('=')
  return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
}))

export async function readUpdateState() {
  const status = parseEnv(await readText('status.env'))
  const last = parseEnv(await readText('last.env'))
  const request = (await readText('request')).trim()
  return {
    supported: Boolean(status.checkedAt),
    available: status.available === '1',
    current: status.current || null,
    remote: status.remote || null,
    count: Number(status.count || 0),
    checkedAt: status.checkedAt || null,
    updateTime: status.updateTime || '22:00',
    commits: (await readText('commits.txt')).split('\n').filter(Boolean).map((line) => ({ hash: line.slice(0, line.indexOf(' ')), subject: line.slice(line.indexOf(' ') + 1) })),
    requested: request || null,
    lastUpdate: last.lastUpdate || null
  }
}

export async function requestUpdate(username: string) {
  await writeFile(join(dir(), 'request'), `${new Date().toISOString()} ${username}\n`)
}
