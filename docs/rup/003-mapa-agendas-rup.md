---
tags:
  - rup
  - turnos
  - mapa-agendas
scope:
  - api
  - app
---

# ADR 0003: Mapa de agendas en RUP (notas, colores y filtro por servicio intermedio)

- **Estado:** Aceptado
- **Fecha:** 2026-11-26
- **Repos afectados:** `api`, `app`
- **Documento de referencia (comportamiento end-to-end):** [`docs/mapa-agenda-module.md`](../../../docs/mapa-agenda-module.md)

> **Este documento es vivo.** Cambios en `notas-agenda`, `mapa-agenda-colores`, el filtro
> `servicioIntermedio` en listados de agenda o en permisos RUP del mapa deben actualizar este ADR.

## Contexto

En el módulo **RUP** se necesita un **calendario operativo** de turnos (vista mes y semana) análogo al de citas (`/citas/mapa_agendas`), montado en `/rup/mapa_agendas`, con permisos `rup:tipoPrestacion:?` y, cuando corresponde, `rup:servicio-intermedio:?`.

Además del listado de agendas, el mapa RUP exige:

1. **Filtrar agendas** por los conceptos SNOMED asociados al **servicio intermedio** elegido (no por los tipos que el cliente conoce).
2. **Notas de calendario** por día y franja horaria, visibles en la grilla semanal, **independientes** de `turno.nota` y de `AgendaSchema.nota`.
3. **Colores por `conceptId` SNOMED** para las barras del mes, sin depender solo del campo legacy `color` en conceptos turneables, y con reglas por alcance **global / organización / profesional**.
4. **Dar turno desde un slot** (principalmente UI) que reutiliza el `GET` genérico de agendas con ventana temporal acotada.

La app consume estos contratos desde `MapaAgendaModule` (`MapaAgendasService`, `NotaAgendaService`, `MapaAgendaColoresService`, `DarTurnoSlotService`). Ver diagrama y flujos en el documento de referencia.

**Relacionado:** [ADR 0002: Ámbito de origen en turnos y prestaciones](../adr-ambito-origen-en-turnos-y-prestaciones.md) — el mapa puede mostrar y enviar `ambitoOrigen` en asignación de turno; no altera el modelo de este ADR.

## Decisión

### 1. Sin recurso REST dedicado “mapa de agendas”

El calendario **no** define un endpoint propio. Sigue usando el listado existente:

- `GET /api/modules/turnos/agenda` (y `GET …/agenda/:id` donde aplique) en `api/modules/turnos/routes/agenda.ts`.

El cliente acota por mes (`fechaDesde` / `fechaHasta`) o, en dar-turno-slot, por slot (`rango`, `desde`, `hasta`). La lógica de armado del calendario vive en la app (`MapaAgendasService`).

**Motivo:** evitar duplicar consultas y permisos; el mapa es una vista sobre agendas ya modeladas.

### 2. Filtro `servicioIntermedio` en listado de agendas

Cuando el query incluye `servicioIntermedio`:

- La API exige permiso `rup:servicio-intermedio:<id>`; sin permiso → `403`.
- Resuelve conceptos del servicio vía `ServicionIntermedioCtr.getConceptosFromIds` y filtra agendas cuyos bloques tengan `tipoPrestaciones.conceptId` en ese conjunto.
- Servicio inexistente → `404`; servicio sin tipos → `[]`.
- El cliente **no** envía la lista de `tipoPrestacion`; el servidor es la fuente de verdad del recorte.

Si **no** se envía `servicioIntermedio` y tampoco `tipoPrestacion` ni `teleConsulta`, el listado sigue **excluyendo** agendas de prestaciones marcadas como teleconsulta (comportamiento previo del módulo turnos).

### 3. `populate=prestaciones` en listado de agendas

Opcional en `GET /agenda` (sin `:id`):

- El servidor agrega en una sola consulta prestaciones por `solicitud.turno` y adjunta `turno.prestacion` en turnos asignados / suspendidos / turno doble y sobreturnos.
- Proyección acotada (sin registros de solicitud/ejecución). Si la consulta falla, el listado responde igual **sin** `turno.prestacion`.
- En `GET /agenda/:id` el query `populate` se **ignora**.

**Motivo:** el mapa y sidebars pueden contextualizar turnos sin N+1; no cambia el contrato base del documento agenda.

### 4. Notas de calendario: colección y API propias

Las notas del mapa RUP son un dominio nuevo, no extensiones de turno o agenda:

| Aspecto | Decisión |
|---------|----------|
| Colección | `notas-agenda` (`NotaAgendaSchema`, `api/modules/turnos/nota-agenda/`) |
| Montaje | `app.use('/api/modules/turnos', NotaAgendaRouter)` |
| Campos clave | `organizacion` (solo servidor), `fecha` (inicio de día), `horaInicio`, `horaFin` (mismo día calendario), `servicioIntermedio`, `texto` (≤ 500, trim) |
| Índice | `{ organizacion._id, fecha, servicioIntermedio._id }` |

**Autorización** (`rup:servicio-intermedio`):

- Búsqueda sin `servicioIntermedio` en query: si el usuario no tiene ningún permiso de servicio intermedio → `[]` sin buscar; con `*` sin filtro de servicio; con ids → `$in` sobre `servicioIntermedio._id`.
- Alta/edición/búsqueda con servicio: `servicioPermitido` — id inválido o servicio ausente en catálogo → `404`; sin permiso sobre ese id → `403`.
- `GET` / `PATCH` / `DELETE` por id (`autorizarNota`): nota de otra org, id inválido o sin permiso sobre el servicio de la nota → **`404`** (no revelar existencia ni gap de permiso).

**Carga en app:** solo en modo RUP (`/rup/mapa_agendas`); en `/citas/mapa_agendas` no se llama a `notas-agenda`.

### 5. Colores SNOMED: colección `mapa-agenda-colores`

Separar **presentación del mapa** del catálogo TM (`conceptos-turneables`):

| Aspecto | Decisión |
|---------|----------|
| Colección | `mapa-agenda-colores` — un color por `conceptId` y **alcance exclusivo**: `global` \| `organizacion` \| `profesional` |
| Unicidad | `(conceptId, alcance, organizacion, profesional)` con coherencia de campos por alcance |
| Lectura del mapa | `GET …/mapa-agenda-colores/resolver` — merge en servidor con precedencia **profesional > organizacion > global**; solo `activo: true` |
| Fallback cliente | `color` del resolver gana sobre `conceptoTurneable.color`; reglas del resolver pueden incluir conceptos no turneables |
| CRUD | Mismas rutas REST bajo `/api/modules/turnos/mapa-agenda-colores`; permisos de escritura por alcance (`tm:…:global:write`, `turnos:…:organizacion:write`, etc.) |
| Query `servicioIntermedio` en `resolver` | Reservado; la API **aún no** filtra por servicio (v2 documentado en referencia) |

**Motivo:** procedimientos del servicio intermedio u otros SNOMED en agenda pueden no estar en conceptos turneables; el mes oculta prestaciones sin color resoluble.

### 6. Permisos de “ver mapa” (API)

Lectura de `resolver` y búsqueda de colores exigen al menos uno de:

- `rup:servicio-intermedio:?`
- `rup:tipoPrestacion:?`
- `turnos:planificarAgenda:prestacion:?`

Alineado con quién puede entrar a `/rup/mapa_agendas` o `/citas/mapa_agendas`.

### 7. Dar turno desde slot (contrato API)

Sin endpoints nuevos:

- Listado de agendas en el slot: mismo `GET /agenda` con `rango=true` y `desde`/`hasta` del slot; mismas reglas de `servicioIntermedio` y estados.
- Asignación: `PATCH /modules/turnos/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda` (incluye `ambitoOrigen` opcional según ADR 0002).

Agendas dinámicas, sobreturnos, turno doble y reasignación suspendida **quedan fuera** del flujo del slot en esta entrega.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|-------------|---------------------|
| Endpoint `GET /mapa-agendas` que devuelva calendario pre-armado | Duplica lógica de negocio hoy en cliente; acopla API a una sola UX. |
| Reutilizar `turno.nota` o `agenda.nota` para notas de calendario | Semántica distinta (bloqueo visual multi-turno por servicio); mezclaría con notas clínicas/administrativas del turno. |
| Solo `conceptoTurneable.color` | No cubre SNOMED del servicio intermedio ni alcance por org/profesional. |
| `403` en nota por id sin permiso | Filtraría existencia del recurso; se prefirió `404` homogéneo con nota de otra organización. |

## Consecuencias

**Positivas**

- Tres extensiones acotadas en turnos (`agenda` query, `notas-agenda`, `mapa-agenda-colores`) sin fork del modelo de agenda.
- Permisos RUP de servicio intermedio centralizados en servidor para agendas y notas.
- Colores y notas auditables (`AuditPlugin`) y evolucionables sin tocar TM.

**Negativas / deuda**

- El mapa depende de múltiples `forkJoin` en cliente; fallos parciales (notas, resolver) degradan a `[]` sin error visible uniforme en API.
- `resolver` sin filtro por `servicioIntermedio` puede resolver más conceptos de los estrictamente necesarios para un servicio.
- Documentación operativa dispersa: este ADR + `docs/mapa-agenda-module.md` + planes en `docs/plans/mapa-agenda-*.md`.

**Operación**

- ABM de colores en app TM: `/tm/mapa-agenda-colores` (no parte del flujo `/rup/mapa_agendas`).
- Script opcional de migración desde `conceptoTurneable.color` a alcance global: `api/scripts/mapa-agenda-colores-migrar-concepto-turneable.ts`.

## Referencias de implementación (API)

| Pieza | Ubicación |
|-------|-----------|
| Listado agenda + `servicioIntermedio` + `populate` | `api/modules/turnos/routes/agenda.ts`, `controller/agenda-prestaciones` |
| Notas | `api/modules/turnos/nota-agenda/` |
| Colores | `api/modules/turnos/mapa-agenda-colores/` |
| Montaje | `api/initialize.ts` |

## Historial de cambios del documento

| Fecha | Cambio |
|-------|--------|
| 2026-11-26 | Versión inicial a partir de `docs/mapa-agenda-module.md`. |