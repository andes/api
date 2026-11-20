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

Es necesario registrar si el paciente de una atención viene de ambulatorio, internación o
guardia, y que eso sea visible. En la prestación ya existe `solicitud.ambitoOrigen`, pero ese
campo **no es solo informativo**: lo define el sistema según el flujo donde nace la prestación
(punto de inicio RUP, mapa de camas de internación o de guardia) y el código lo usa para decidir:

- qué prestaciones lista el punto de inicio RUP (solo `ambulatorio`) y, por ende, qué
  prestación se vincula a cada turno;
- el campo `inicio` (`internacion` vs `agenda` / `fuera-agenda`);
- a dónde vuelve el botón "Volver" (punto de inicio o mapa de camas);
- historial de citas, estadísticas y comportamiento propio de cada ámbito.

Si el usuario pudiera elegir `ambitoOrigen` en un turno de consultorio, la prestación dejaría de
aparecer en el punto de inicio, el turno se vería como no iniciado y `inicio` quedaría mal.

## Decisión

Dos conceptos separados, con los mismos valores `ambulatorio | internacion | guardia`
(`modules/rup/ambito-origen.ts`):

- **`solicitud.ambitoOrigen`**: flujo donde nace la prestación. Lo define el sistema; no se
  expone para que el usuario lo elija. Sin cambios respecto de master.
- **`procedencia`**: de dónde viene el paciente. Lo informa el usuario, es opcional y solo
  informativo.
  - En el **turno** o sobreturno (`turno.procedencia`), al darlo.
  - En la **prestación** (`solicitud.procedencia`), al crearla fuera de agenda o al iniciarla
    desde un turno o servicio intermedio (`PATCH /prestaciones/:id` con `op: 'estadoPush'` y
    `procedencia`).

Validaciones:

- La creación de prestaciones valida `solicitud.procedencia` si viene informada.
- `estadoPush` con `procedencia` rechaza valores inválidos y prestaciones validadas.
- La asignación de turnos y la creación de sobreturnos rechazan valores inválidos. Los
  valores vacíos o nulos se tratan como no informados.
- Al liberar o reutilizar un turno se limpia `procedencia`.

## Consecuencias

- Los flujos que dependen de `ambitoOrigen` no cambian.
- El esquema de `solicitud.procedencia` no restringe valores con `enum`; la validación está en
  las rutas.
- Al mostrar: la procedencia de la prestación, luego la del turno. Si no hay procedencia, se
  puede mostrar el ámbito (`ambitoOrigen`) diferenciado como tal.

## Historial de cambios del documento

| Fecha | Cambio |
|---|---|
| 2026-10-30 | Versión inicial. |
| 2026-11-04 | Se unifica `condicionPaciente` en `ambitoOrigen` por review del PR. |
| 2026-11-20 | Se separa `procedencia` (informada por el usuario) de `ambitoOrigen` (definido por el sistema): elegir `ambitoOrigen` a mano rompía el punto de inicio, el vínculo turno-prestación, `inicio` y la navegación. |
