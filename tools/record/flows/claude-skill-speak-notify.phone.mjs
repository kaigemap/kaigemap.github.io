import { pathToFileURL } from 'node:url'
export const url = pathToFileURL(new URL('../scenes/speak-notify-phone.html', import.meta.url).pathname).href
export const settle = 0
export const cursor = false
export default async (s) => { await s.sleep(9000) }
