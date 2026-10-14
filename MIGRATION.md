# Migraciones de Node.js — ANDES API

Este documento registra las migraciones del runtime de Node.js de ANDES API, incluyendo cambios de dependencias, compatibilidad, pruebas y tareas pendientes.

---

# Migración: Node.js 14 → 18

## Fecha
19-12-2025

## Resumen
Migración del runtime de Node.js 14 a Node.js 18.
Incluye ajustes en dependencias, tests y configuración de CI.

## Cambios principales

### Runtime
- Node.js >=18 <19
- Actualización de GitHub Actions a Node 18

### TypeScript
- Ajustes de tipado en `req.query` y `req.params`.
- Uso de cast explícito en métodos de schemas (`this as DocType`).
- `skipLibCheck: true` mantenido.

### Jest / Tests
- Se agregó `testTimeout` para soportar `mongodb-memory-server`.
- Eliminado uso de `jasmine.DEFAULT_TIMEOUT_INTERVAL`.

### Dependencias problemáticas
- `mongoose-gridfs` (posteriormente reemplazado en la migración a Node 22).
- `@lykmapipo/common`.
- Downgrade de `mime` y `flat` para compatibilidad CommonJS (overrides).
- Rebuild de módulos nativos (`libxmljs2`).

### MongoDB
- Warnings conocidos:
  - `collection.update` (deprecated).
  - `ensureIndex` (deprecated).
- No afectaron el funcionamiento observado.

## Estado final
- Build OK.
- Tests OK.
- API funcional en Node 18.

---

# Migración: Node.js 18 → 22

## Fecha
Octubre de 2026.

## Resumen
Migración del runtime de ANDES API a Node.js 22.11.0.

Incluye actualización de dependencias incompatibles, reemplazo de la implementación de GridFS, ajustes en los tests y validaciones funcionales de la API.

## Cambios principales

### Runtime y dependencias
- Actualización a Node.js 22.11.0.
- Actualización de `sharp` de 0.29.3 a 0.33.5 para compatibilidad con Node 22.
- Reemplazo de `node-sass` por Dart Sass (`sass`).
- Actualización de las dependencias y del archivo `package-lock.json`.

### GridFS
- Eliminación de la dependencia `mongoose-gridfs`.
- Implementación mediante `GridFSBucket` del driver nativo de MongoDB.
- Incorporación de utilidades compartidas para el acceso a GridFS.
- Adaptación de operaciones de almacenamiento, lectura y eliminación de archivos.
- Actualización de los controladores y rutas que utilizaban la implementación anterior.
- Conservación de la compatibilidad de lectura con archivos almacenados previamente.

### Jest / Tests
- Se mantiene la ejecución de tests con Jest y `mongodb-memory-server`.
- Incorporación de un mock de `@andes/log` para evitar operaciones de creación de índices durante los tests.
- El mock evita que los loggers intenten utilizar una conexión MongoDB no inicializada, provocando errores de buffering timeout.
- Resultado: 6 suites y 43 tests satisfactorios.
- Jest finaliza correctamente sin operaciones pendientes relacionadas con `@andes/log`.

### MongoDB y conexiones
- Se deshabilitó la creación automática de índices de Mongoose mediante `autoIndex: false`.
- Se mantiene temporalmente el mecanismo de conexión anterior del driver MongoDB.
- Se conserva la configuración existente de reconexión.
- No se modificó el comportamiento de creación explícita de índices de `@andes/log`.

### Validaciones funcionales
- Inicio correcto de la API con Node 22.
- Lectura y escritura de datos en MongoDB.
- Visualización y descarga de archivos históricos.
- Subida y descarga de archivos nuevos mediante GridFS.
- Generación y descarga de documentos PDF.
- Registro de logs.
- Compilación TypeScript y tests satisfactorios.
- Ejecución de la versión migrada en servidores de prueba.

## Advertencias conocidas

### Node.js
- `DEP0040`: uso del módulo obsoleto `punycode` desde `tough-cookie`.

### MongoDB
- Advertencia del mecanismo antiguo de Server Discovery and Monitoring.
- Métodos heredados como `collection.update` y `ensureIndex`.

### Sass
- Uso de `@import` en archivos SCSS de generación de PDF.
- Dart Sass recomienda migrar a `@use` y `@forward`.

Estas advertencias no impidieron el funcionamiento observado durante las pruebas.

## Mejoras pendientes

1. **@andes/log:** evitar por defecto la creación automática de índices durante la inicialización de `Logger`, permitiendo su creación explícita. Revisar posteriormente la necesidad del mock de Jest.
2. **MongoDB / Unified Topology:** migrar a `useUnifiedTopology: true`, eliminar `reconnectTries` y `reconnectInterval` y validar el comportamiento ante desconexiones y reconexiones.
3. **connections.ts:** revisar la necesidad de mantener conexiones independientes a la base de logs.
4. **Mongoose y driver MongoDB:** evaluar una actualización a versiones con soporte vigente y modernizar la configuración de conexiones.
5. **punycode:** identificar y actualizar la dependencia responsable de la advertencia.
6. **Sass:** migrar las directivas `@import` a `@use` y `@forward`.
7. **GridFS:** completar pruebas de archivos inexistentes, eliminación y lectura posterior a la eliminación.

## Estado final
- Build TypeScript OK.
- 6 suites y 43 tests OK.
- API funcional en Node 22.11.0.
- Operaciones principales de GridFS validadas.
- Pruebas funcionales satisfactorias en entorno de pruebas.
- Mejoras no bloqueantes documentadas para próximas actualizaciones.