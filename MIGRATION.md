# Migration: Node.js 14 → 18

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
- Ajustes de tipado en `req.query` y `req.params`
- Uso de cast explícito en métodos de schemas (`this as DocType`)
- `skipLibCheck: true` mantenido

### Jest / Tests
- Se agregó `testTimeout` para soportar `mongodb-memory-server`
- Eliminado uso de `jasmine.DEFAULT_TIMEOUT_INTERVAL`

### Dependencias problemáticas
- `mongoose-gridfs`
- `@lykmapipo/common`
- Downgrade de `mime` y `flat` para compatibilidad CommonJS (overrides)
- Rebuild de módulos nativos (`libxmljs2`)

### MongoDB
- Warnings conocidos:
  - `collection.update` (deprecated)
  - `ensureIndex` (deprecated)
- No afectan funcionamiento actual

## Estado final
- ✅ Build OK
- ✅ Tests OK
- ✅ API funcional en Node 18
