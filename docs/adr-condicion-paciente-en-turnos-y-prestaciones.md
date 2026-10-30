---
tags:
  - rup
  - turnos
scope:
  - api
  - app
---

# ADR 0002: Condición del paciente en turnos y prestaciones

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Repos afectados:** `api`

> **Este documento es vivo.** Los cambios que afecten el almacenamiento o la validación de
> `condicionPaciente` en turnos o prestaciones deben actualizar este ADR.

## Contexto

Los flujos de turnos y prestaciones necesitan registrar la condición del paciente asociada
a la atención. El dato requiere un conjunto de valores controlado, debe poder omitirse y no
debe modificarse en una prestación que ya fue validada.

## Decisión

Agregar el campo opcional `condicionPaciente` a los modelos de turnos y prestaciones, con
estos valores permitidos:

- `ambulatorio`
- `internado`
- `guardia`

La lista de valores y su validación se centralizan en `modules/rup/condicion-paciente.ts`
para reutilizarlas en los flujos de ambos módulos. Los esquemas de persistencia limitan el
campo a esos valores.

Las rutas validan el dato antes de procesarlo:

- La creación de prestaciones y su actualización mediante `estadoPush` rechazan valores
  inválidos. En `estadoPush`, no se permite cambiar la condición si la prestación ya está
  validada.
- La asignación de turnos y la creación de sobreturnos rechazan condiciones inválidas. En
  los sobreturnos, los valores vacíos o nulos se tratan como dato no informado.
- La asignación de un turno guarda la condición recibida. Al liberar o reutilizar un turno,
  se limpia la condición anterior para evitar que se herede en otra atención.

## Alternativas consideradas

Los cambios revisados no documentan otras alternativas consideradas.

## Consecuencias

**Positivas**

- Prestaciones y turnos pueden guardar la condición sin hacer obligatorio el dato para
  registros existentes o nuevas solicitudes que lo omitan.
- Los valores aceptados son consistentes entre validación de rutas y esquemas de persistencia.
- La condición no persiste accidentalmente al liberar o reutilizar un turno.

**Negativas / a vigilar**

- Los consumidores de estas rutas deben enviar uno de los valores definidos cuando informen
  `condicionPaciente`.
- La condición de una prestación validada no puede modificarse mediante `estadoPush`.

## Alcance y puntos abiertos

El alcance documentado comprende la persistencia y validación de `condicionPaciente` en los
flujos de prestaciones y turnos descritos en este ADR. Los cambios TypeScript revisados no
identifican puntos abiertos adicionales.

## Historial de cambios del documento

| Fecha | Cambio |
|---|---|
| 2026-10-30 | Versión inicial, basada en los cambios TypeScript locales. |
