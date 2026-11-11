// Main paths for ~/.claude/skills/web-tool-safety/check.mjs: arc keys and arrows, language, grid and back.
export default async (api) => {
  await api.waitFor(`document.body.classList.contains('ready')`, 5000)
  await api.click('#next')
  await api.sleep(600)
  await api.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`)
  await api.sleep(600)
  for (const code of ['en', 'es', 'ko', 'ja']) {
    await api.click(`#langs button[lang=${code}]`)
    await api.sleep(150)
  }
  await api.click('#views [data-view=grid]')
  await api.sleep(900)
  await api.click('.card[data-index="2"] .frame')
  await api.sleep(900)
  const ok = await api.evaluate(`document.body.dataset.view === 'arc' && document.querySelector('#caption-name').textContent === 'DiscordPyoko'`)
  if (!ok) throw new Error('grid -> arc did not land on the tapped card')
}
