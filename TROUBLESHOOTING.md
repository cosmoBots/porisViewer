# Troubleshooting

Este documento recoge el diagnóstico y las posibles razones de latencia/performance en la carga de modelos PORIS.

## Problema observado

Con modelos reales del repositorio, por ejemplo `public/models/ARCGenIII_from_csys.xml`, se observa una pausa larga antes de que comiencen las trazas de parseo o el procesamiento en el store.

El problema se manifiesta antes de que la UI empiece a responder, lo que sugiere un coste en el parseo/modelado inicial y en la conversión de datos a reactividad.

## Estado actual del código

El código actual del store ha incorporado mejoras para reducir rerenders intermedios durante la actualización de modos:

- se usa `pauseTracking()` / `enableTracking()` para suspender la reactividad mientras se recalculan los modos
- se llama a `triggerRef()` para forzar un único update al final
- existe un flag reactivo `isLoading` en `src/stores/model.js` para controlar el estado de carga

Estas optimizaciones ayudan a que la aplicación no haga múltiples renders innecesarios durante la recursión de modos.

## Diagnóstico recomendado

1) Arrancar el servidor de desarrollo:
```sh
npm install
npm run dev
```
2) Abrir la app en el navegador y usar la pestaña Performance para grabar la carga del modelo y buscar "Long Tasks" y scripting cost.
3) Instrumentar temporalmente `.then()` y la asignación del modelo en `src/stores/model.js` con `console.time()` / `console.timeEnd()` para medir:
   - tiempo de parseo en `parseToPorisModel()`
   - tiempo de asignación de `values`, `modes`, `subsystems` y `rootSubsystem`
4) Probar el build de producción:
```sh
npm run build
npm run preview:prod
```
Comparar los tiempos en desarrollo y producción, ya que es posible que HMR/dev tooling añada latencia extra.

## Potenciales mejoras adicionales

- Opción A — Evitar reactividad profunda para el dataset completo: usar `shallowRef` o `markRaw` para almacenar el modelo.

Ejemplo con `shallowRef` en `src/stores/model.js`:
```js
import { shallowRef } from 'vue'
// ...
const values = shallowRef([])
// al asignar:
values.value = JSONmodel.values
```

Ejemplo con `markRaw` para evitar que Vue convierta los nodos en proxies:
```js
import { markRaw } from 'vue'
values.value = JSONmodel.values.map(v => markRaw(v))
modes.value = JSONmodel.modes.map(m => markRaw(m))
```

- Opción B — Mantener el modelo no reactivo y exponer sólo lo necesario: asignar el modelo completo con `markRaw(JSONmodel)` y crear refs reactivos sólo para los parámetros que la UI necesite actualizar.
- Opción C — Parseo en un Web Worker: mover `parseToPorisModel()` fuera del hilo principal para que el proceso de carga no bloquee el render.
- Opción D — Procesado por chunks / incremental: si no se usa worker, dividir la carga con `setTimeout` o `requestIdleCallback` y añadir partes de modelo progresivamente.
- Opción E — Virtualizar listados o árboles en la UI: usar un virtual-scroller para renderizar sólo los elementos visibles si hay muchas entradas.

## Consejos específicos para este repo

- `src/stores/xmlParser.js` crea muchas instancias `new PorisNode(...)`.
- `src/stores/model.js` guarda el modelo en refs. En la rama `troubleshooting` se ha explorado el uso de `shallowRef` y `markRaw()` para evitar reactividad profunda en la asignación del modelo.
- Medir y aislar: añadir `console.time()` antes/después de `parseToPorisModel()` y antes/después de la asignación de `values.value` para saber si el coste está en el parseo o en la conversión reactiva.
