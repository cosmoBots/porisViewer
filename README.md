# porisViewer

Proyecto para visualizar y editar modelos PORIS a partir de ficheros XML.

**Resumen rápido**: la UI está construida con Vue 3 + Vite + Pinia. Los XML se descargan con `axios`, se parsean en el cliente en `src/stores/xmlParser.js` y el modelo resultante se guarda en el store de Pinia (`src/stores/model.js`).

**Requisitos**:
- **Node >=16** (según tu entorno), npm
- Ejecutar `npm install` para instalar dependencias

**Comandos comunes**:
```sh
npm install
npm run dev        # servidor de desarrollo (Vite + HMR)
npm run build      # build para producción
npm run preview:prod # preview del build (usa "preview:prod" definido en package.json)
```

**IDE recomendado**: VSCode + Volar (para Vue 3).

**Estructura relevante**:
- **Código de carga/parseo XML**: [src/api/modelLoader.js](src/api/modelLoader.js#L1) y [src/stores/xmlParser.js](src/stores/xmlParser.js#L1)
- **Modelo y estado**: [src/stores/model.js](src/stores/model.js#L1) (Pinia)
- **Clases de nodos**: [src/stores/porisNode.js](src/stores/porisNode.js#L1)
- **Componentes principales**: [src/App-dev.vue](src/App-dev.vue#L1), [src/components/ModelSelector.vue](src/components/ModelSelector.vue#L1), [src/components/InputSystemPanel.vue](src/components/InputSystemPanel.vue#L1), [src/views/ModelXMLView.vue](src/views/ModelXMLView.vue#L1)

**Cómo se carga un modelo (resumen técnico)**:
- `src/api/modelLoader.js`: descarga el XML con `axios` y devuelve el texto XML.
- `src/stores/xmlParser.js` (`parseToPorisModel()`): usa `DOMParser` para transformar el XML en una estructura JavaScript (`JSONmodel`) y crea instancias de `PorisNode`.
- `src/stores/model.js`: llama a `parseToPorisModel()` y asigna `values`, `modes`, `subsystems` y `rootSubsystem` a refs de Pinia.

**Problema observado**
Con modelos reales de este repositorio, como `public/models/ARCGenIII_from_csys.xml`, ya se observa una pausa larga antes de que comiencen las trazas de parseo o el procesamiento en el store. El problema se manifiesta antes de que la UI empiece a responder, lo que sugiere coste en el parseo/modelado inicial y en la conversión de datos a reactividad.

**Contexto en Vue**
- Convertir objetos y arrays muy grandes a estructuras reactivas es costoso. Vue 2 (Object.defineProperty) era especialmente lento; Vue 3 (Proxy) mejora el rendimiento, pero la creación/recursión de proxies para muchos objetos sigue siendo una operación que puede bloquear el hilo principal.
- HMR / dev-server puede volverse lento si el proyecto importa o procesa activos muy grandes en tiempo de desarrollo.
- En el código actual del store se ha añadido un ajuste para pausar el tracking de reactividad durante la recalculación de modos (`pauseTracking` / `enableTracking`) y para triggerear un único update con `triggerRef()`. También existe un flag reactivo `isLoading` para controlar el estado de carga.

Recomendaciones y pasos para diagnosticar y mitigar (para ejecutar en otra máquina)

**Diagnóstico (pasos reproducibles)**
- 1) Arrancar el servidor de desarrollo: `npm run dev`.
- 2) Abrir la app en Chrome/Edge y usar pestaña Performance para grabar la carga completa del modelo y buscar "Long Tasks" y scripting cost.
- 3) Instrumentar temporalmente el parseo/assignación añadiendo `console.time('parse')` / `console.timeEnd('parse')` alrededor de `parseToPorisModel()` y la asignación en `loadModel()` para medir cuánto tiempo ocupa cada paso.
- 4) Probar el `build` de producción: `npm run build && npm run preview:prod` y comparar tiempos (el comportamiento en producción suele ser más rápido por optimizaciones y sin HMR).

**Potenciales mejoras adicionales (cambios de código rápidos)**
- Opción A — Evitar reactividad profunda para el dataset completo: usar `shallowRef` o `markRaw` para almacenar el modelo.

Ejemplo con `shallowRef` en `src/stores/model.js`:
```js
import { shallowRef } from 'vue'
// ...
const values = shallowRef([])
// al asignar: values.value = JSONmodel.values
```

Ejemplo con `markRaw` para evitar que Vue convierta los nodos en proxies:
```js
import { markRaw } from 'vue'
// después de parsear:
values.value = JSONmodel.values.map(v => markRaw(v))
modes.value = JSONmodel.modes.map(m => markRaw(m))
```

- Opción B — Mantener el modelo no reactivo y exponer sólo lo necesario: asignar el modelo completo con `markRaw(JSONmodel)` y crear refs reactivos sólo para los parámetros que la UI necesite actualizar.
- Opción C — Parseo en un Web Worker: mover `parseToPorisModel()` fuera del hilo principal para que no bloquee el render.
- Opción D — Procesado por chunks / incremental: si no puedes usar worker, trocea la carga con `setTimeout`/`requestIdleCallback` y va añadiendo partes progresivamente.
- Opción E — Virtualizar listados/árboles en la UI: si hay listas largas, usar un virtual-scroller para renderizar sólo los elementos visibles.

**Consejos específicos para este repo**
- `src/stores/xmlParser.js` crea muchas instancias `new PorisNode(...)` y `src/stores/model.js` guarda el modelo en refs. En la rama troubleshooting se ha explorado el uso de `shallowRef` y `markRaw()` para evitar reactividad profunda en la asignación del modelo.
- Medir y aislar: añadir `console.time` antes/después de `parseToPorisModel()` y antes/después de `values.value = JSONmodel.values` para saber si el coste está en parseo o en la conversión reactiva.

**Comandos útiles para probar y perfilar**
```sh
npm install
npm run dev
# en otra terminal, build+preview
npm run build
npm run preview:prod
```



