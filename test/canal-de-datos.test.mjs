/**
 * LO ÚNICO QUE ESTE PAQUETE PROMETE: que dos pares abren un canal de datos y se hablan.
 *
 * Es la prueba que decide si una poda vale. Al traer una versión nueva de arriba se
 * vuelven a quitar `rtp` y `nonstandard`, y si después de eso esto no pasa, esa versión
 * necesita otra cosa y NO se publica.
 *
 * Se usa a propósito la API DEL NAVEGADOR (`onicecandidate`, `ondatachannel`, `onmessage`)
 * y no la de suscripciones de werift: es la que usa `@dotrino/proxy-client`, así que es la
 * que hay que garantizar. Si una versión de arriba la rompiera, el pilar dejaría de
 * funcionar y aquí se vería antes.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { RTCPeerConnection } from '../lib/index.mjs'

test('dos pares abren un canal de datos y se hablan', async () => {
  const a = new RTCPeerConnection({ iceServers: [] })
  const b = new RTCPeerConnection({ iceServers: [] })
  a.onicecandidate = (ev) => { if (ev.candidate) b.addIceCandidate(ev.candidate) }
  b.onicecandidate = (ev) => { if (ev.candidate) a.addIceCandidate(ev.candidate) }

  const recibido = new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('no llegó nada en 25 s')), 25000)
    b.ondatachannel = (ev) => { ev.channel.onmessage = (m) => { clearTimeout(t); ok(String(m.data)) } }
  })

  const dc = a.createDataChannel('dotrino')
  const abierto = new Promise((ok) => { dc.onopen = () => ok() })

  await a.setLocalDescription(await a.createOffer())
  await b.setRemoteDescription(a.localDescription)
  await b.setLocalDescription(await b.createAnswer())
  await a.setRemoteDescription(b.localDescription)

  await abierto
  dc.send('hola')
  assert.equal(await recibido, 'hola')
  a.close(); b.close()
})

/**
 * LA PODA SIGUE PODADA. Si un rebase se trae `rtp` o `nonstandard` de vuelta —o la
 * dependencia de vídeo— esto se pone rojo: es el único sitio donde se notaría, porque el
 * canal de datos funcionaría igual y nadie lo miraría.
 */
test('no vuelve a entrar la pila de medios', async () => {
  const fs = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const raiz = fileURLToPath(new URL('..', import.meta.url))
  for (const d of ['lib/rtp', 'lib/nonstandard']) {
    assert.equal(fs.existsSync(raiz + d), false, d + ' volvió: la poda hay que rehacerla')
  }
  const pkg = JSON.parse(fs.readFileSync(raiz + 'package.json', 'utf8'))
  for (const d of ['mediabunny', 'buffer']) {
    assert.equal(d in (pkg.dependencies || {}), false, d + ' volvió a las dependencias')
  }
  assert.ok(pkg.upstream?.version, 'hay que decir de qué versión de arriba sale esta poda')
})
