---
tags:
  - rup
  - turnos
scope:
  - api
  - app
---

# ADR 0002: Ámbito de origen en turnos y prestaciones

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Repos afectados:** `api`, `app`

> **Este documento es vivo.** Los cambios que afecten el almacenamiento o la validación de
> `ambitoOrigen` en turnos o prestaciones deben actualizar este ADR.

## Contexto

Es necesario registrar si una atención es ambulatoria, de internación o de guardia. Ese
concepto ya existe como `solicitud.ambitoOrigen` en las prestaciones, por lo que no se
introduce un campo paralelo ("condición del paciente").

## Decisión

Un único concepto: `ambitoOrigen`, con valores `ambulatorio | internacion | guardia`
(`modules/rup/ambito-origen.ts`).

- **Caso normal:** el valor llega con la solicitud (`solicitud.ambitoOrigen`).
- **Escape hatch:** cuando no vino por la solicitud, se puede informar en el **turno** o
  sobreturno (`ambitoOrigen`, opcional) o en la **prestación** fuera de agenda
  (`PATCH /prestaciones/:id` con `op: 'estadoPush'` y `ambitoOrigen`, que actualiza
  `solicitud.ambitoOrigen`).
- No existe un campo `condicionPaciente` en la raíz de la prestación.

Validaciones:

- La creación de prestaciones valida `solicitud.ambitoOrigen` si viene informado.
- `estadoPush` con `ambitoOrigen` rechaza valores inválidos, prestaciones validadas y
  prestaciones asociadas a un evento (`trackId`).
- La asignación de turnos y la creación de sobreturnos rechazan valores inválidos. Los
  valores vacíos o nulos se tratan como no informado.
- Al liberar o reutilizar un turno se limpia `ambitoOrigen`.

## Consecuencias

- Un solo enum y un solo nombre en turno, solicitud y prestación.
- El esquema de `solicitud.ambitoOrigen` no restringe valores con `enum` para no invalidar
  documentos existentes; la validación está en las rutas.
- Al leer, la precedencia sugerida es `solicitud.ambitoOrigen`, luego el del turno, y por
  defecto `ambulatorio`.

## Historial de cambios del documento

| Fecha | Cambio |
|---|---|
| 2026-10-30 | Versión inicial. |
| 2026-11-04 | Se unifica `condicionPaciente` en `ambitoOrigen` por review del PR. |
