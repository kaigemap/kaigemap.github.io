import { OSHI, setup } from './_oshinagaki.mjs'
export const url = OSHI
export const prepare = async (s) => {
  await setup(s)
  await s.eval('document.activeElement?.blur(); scrollTo(0, 0)')
  await s.sleep(800)
}
export default async (s) => {
  await s.sleep(1400)
  await s.scrollBy(520, 560)
  await s.sleep(1600)
  await s.scrollBy(-520, 560)
  await s.sleep(1600)
}
