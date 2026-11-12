// ocbox runs from its own dev server (cd ~/dev/ocbox && npx vite --port 5192) with the fake storage from its
// e2e tests (e2e/fake-remote.mjs), so nothing touches Dropbox. The character is the owner's test character.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
export const OCBOX = 'http://localhost:5192/'
const fixtures = join(homedir(), 'dev/ocbox/e2e/fixtures')
export const character = JSON.parse(readFileSync(join(fixtures, 'character.json'), 'utf8'))
export const init = `localStorage.setItem('ocbox:started', '1'); localStorage.setItem('ocbox:panels', '0'); localStorage.setItem('ocbox:install-hint', 'dismissed')`
export const before = (s) => s.serve(`${OCBOX}__e2e__/`, fixtures)
export async function connect(s, characters = [character]) {
  await s.eval(`new Promise((r) => { const t = setInterval(() => { if (window.__ocboxStore) { clearInterval(t); r() } }, 50) })`)
  await s.eval(`(async (all) => {
    const store = window.__ocboxStore
    const files = new Map(all.map((c) => ['/' + c.id, { c, rev: 1 }]))
    const folders = new Map(all.map((c) => [c.id, '/' + c.id]))
    const saved = new Map()
    store.remote = () => ({
      setFolder(id, folder) { folders.set(id, folder) },
      async index() { return [...files].map(([folder, f]) => ({ folder, rev: String(f.rev) })) },
      async read(folder) { return structuredClone(files.get(folder).c) },
      async write(c) { const folder = folders.get(c.id) ?? '/' + c.id; folders.set(c.id, folder); const rev = (files.get(folder)?.rev ?? 0) + 1; files.set(folder, { c: structuredClone(c), rev }); return { folder, rev: String(rev) } },
      async keepCopy() {},
      async remove(id) { files.delete(folders.get(id)) },
      async saveAttachment(c, name, content) { saved.set(c.id + '/imports/' + name, content) },
      async saveFile(c, path, data) { saved.set(c.id + '/' + path, data) },
      async deleteFile(c, path) { saved.delete(c.id + '/' + path) },
      async shareLink(c) { return 'https://example.com/' + c.id },
      async canShare() { return true },
      async revokeLink() {},
      async listFiles(c, dir = '') { const prefix = c.id + '/' + (dir ? dir + '/' : ''); return [...saved.keys()].filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/')).map((k) => k.slice(prefix.length)) },
      async moveFile() {},
      async downloadFile(c, path) { const v = saved.get(c.id + '/' + path); if (v !== undefined) return v instanceof Blob ? v : new Blob([v]); const res = await fetch('/__e2e__/' + path); if (!res.ok) throw new Error('not_found'); return res.blob() },
      async fileUrl() { return '' },
    })
    await store.sync()
  })(${JSON.stringify(characters)})`)
  await s.sleep(1500)
}
