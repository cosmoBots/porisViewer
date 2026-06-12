# porisViewer

Proyecto para visualizar y editar modelos PORIS a partir de ficheros XML.

**Resumen rápido**: la UI está construida con Vue 3 + Vite + Pinia. Los XML se descargan con `axios`, se parsean en el cliente en `src/stores/xmlParser.js` y el modelo resultante se guarda en el store de Pinia (`src/stores/model.js`).

**Requisitos**:
- **Node >=16** (según tu entorno), npm
- Ejecutar `npm install` para instalar dependencias

**Comandos comunes**:
```sh
npm install
npm ci             # instalación reproducible si existe package-lock.json
npm run dev        # servidor de desarrollo (Vite + HMR)
npm run build      # build para producción
npm run preview:prod # preview del build (usa "preview:prod" definido en package.json)
```

**Uso desde pyPORIS**:
```sh
../porispanel.sh --web example/example
```

El lanzador copia el XML generado a `public/runtime/`, arranca Vite en
`127.0.0.1:5173` si hace falta y abre una URL con el parámetro `model`.
También puede abrirse manualmente:

```text
http://127.0.0.1:5173/?model=%2Fruntime%2Fexample_example.xml
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

**Soporte y diagnóstico**
Para detalles de lentitud, diagnóstico y optimización de rendimiento, revisa `TROUBLESHOOTING.md`.


