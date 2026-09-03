# `@dotrino/webrtc` — WebRTC en JavaScript puro, **solo canales de datos**

Poda de [werift](https://github.com/shinyoshiaki/werift-webrtc). Sirve para que dos
máquinas Node del ecosistema se hablen **directo** en vez de dar la vuelta por el proxio,
que es el escalón 2 de la regla del transporte (`CLAUDE.md`).

## POR AHORA: aquí solo se QUITA, no se cambia lógica

Es una decisión reversible y con fecha de revisión, no una ley.

**Mientras arriba siga vivo**, cada arreglo suyo en el manejo de DTLS —código que parsea
red hostil, donde un fallo sutil no se ve— es gratis para nosotros, porque lo de aquí es lo
mismo con partes de menos. Renunciar a eso hoy sería pagar por adelantado.

Así que si hace falta algo que aquí no está, primero las dos salidas que no tocan `lib/`:

1. **Envolverlo desde fuera** (en `@dotrino/proxy-client`, que es quien lo usa).
2. **Pedirlo arriba.** Un parche aceptado en werift lo tiene todo el mundo, y aquí llega en
   el siguiente rebase.

### Cuándo deja de ser un fork y pasa a ser nuestro

El dueño lo preguntó al crearlo —*«¿por qué no quieres que se convierta en un proyecto?»*— y
la respuesta honesta es que **no es «nunca», es «todavía no»**. Dos disparadores, y
cualquiera basta:

- **Arriba se queda quieto.** Es un solo mantenedor en 0.x: si deja de publicar, esto se
  hereda igual. Mejor a propósito que de urgencia.
- **Hace falta algo que no se puede envolver desde fuera.** Ahí el fork ya no ahorra
  trabajo, solo lo esconde.

Y conviene decir lo que eso significaría, para que se elija con los ojos abiertos: pasar a
mantener DTLS, ICE y SCTP. Es un trabajo distinto del resto del ecosistema —donde el modelo
es propio y se puede razonar entero— porque aquí no hay prueba que te diga que tu handshake
es correcto contra alguien que lo ataca a propósito.

## Por qué existe

La bóveda guarda la llave maestra. Meterle 42 paquetes con la pila de audio y vídeo dentro,
para usar **solo canales de datos**, es superficie que hay que auditar y que no se usa.

| | werift 0.24.4 | esta poda |
|---|---|---|
| Paquetes | 42 | **21** |
| Peso | 5,8 MB | **3,7 MB** |
| `mediabunny` (multiplexado de vídeo) | 11 MB | **fuera** |

`mediabunny` **no lo referencia el camino de datos**: solo aparece en `nonstandard` y en el
contenedor MP4. Once megas de código que nunca se ejecutaban.

## Qué se quitó, exactamente

- `lib/rtp/` — audio y vídeo. Un canal de datos no lo toca.
- `lib/nonstandard/` — `userMedia` y compañía.
- Del `package.json`: `mediabunny` y `buffer`, que solo entraban por ahí.
- El subpath `./nonstandard` de `exports`.

Y **nada más**. `lib/index.mjs` —el paquete que ejecuta el camino de datos, 567 KB— está
byte a byte como arriba, igual que `ice`, `dtls`, `sctp` y `webrtc`.

## Lo que sigue siendo cierto, y conviene no olvidar

Esto sigue siendo **DTLS, ICE y SCTP en JavaScript, de un solo mantenedor y en 0.x**,
corriendo en el proceso que guarda tu maestra. La poda reduce lo que hay que auditar; no
lo vuelve seguro por sí sola.

Por eso la otra mitad de la defensa vive en `@dotrino/proxy-client`: **solo se negocia con
quien está en el acta** (`acceptDirectFrom`). Sin eso, cualquiera que supiera alcanzarte
por el proxio podía hacerte ejecutar este código. Las dos cosas van juntas.

En JavaScript no hay corrupción de memoria, así que el peor caso realista es una caída o un
fallo de lógica — no una escritura fuera de límites. Es el argumento que hizo elegir esto
antes que un binario nativo; el otro, más duro, es que la bóveda se distribuye como un
ejecutable único (SEA) y un `.node` no entra ahí.

## Traer los arreglos de arriba

```sh
npm view werift version                 # ¿hay una nueva?
npm pack werift@<version> && tar xzf werift-<version>.tgz
rm -rf lib && cp -r package/lib lib
rm -rf lib/rtp lib/nonstandard          # la poda, otra vez
# y `upstream.version` del package.json al día
```

Después, **la prueba**: `npm test`. Si el canal de datos no negocia, la poda de esa versión
necesita otra cosa y hay que mirarla — no se publica.
