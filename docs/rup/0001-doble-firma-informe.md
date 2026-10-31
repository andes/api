---
tags:
  - rup
  - auth
  - pdf
scope:
  - api
  - app
---

# ADR 0001: Doble firma del informe y rol del profesional firmante

- **Estado:** Aceptada. Enmendada el 2026-10-01 (el rol se deriva de permisos en esta etapa, ver "Decisión"), el 2026-10-19 (pre-validar requiere el permiso explícito `rup:prevalidacion`; etapa 1 implementada, ver "Historial de cambios") y el 2026-10-31 (se elimina el estado `pendienteValidacion` y la cola de pendientes del punto de inicio; "Validar" se oculta solo a quien tiene `rup:prevalidacion`).
- **Fecha:** 2026-10-01
- **Repos afectados:** `api`, `app`

> **Este documento es vivo.** Cualquier cambio posterior que afecte a lo decidido acá
> (modelo de firmas, rol del profesional, permisos, estados, atribución en estadísticas)
> debe actualizar este ADR en el mismo PR. Si la decisión cambia de fondo, no se borra:
> se marca como `Reemplazada` y se crea un ADR nuevo que la referencie.

## Contexto

Hoy el informe médico (una Prestación RUP cuyo último estado es `validada`) tiene un único
firmante: quien presiona "Validar". Esa identidad sale del JWT y se guarda en
`estados[].createdBy`. La producción estadística le atribuye el informe a esa persona, aun
cuando lo haya elaborado un médico residente (práctica habitual en hospitales escuela).

La atribución no es uniforme, y eso agrava el problema: el turno (`turno.profesional`), el
informe PDF y la codificación (que alimenta PECAS) toman al validador, mientras que otros
listados de producción toman `solicitud.profesional`, que es quien ejecutó o fue asignado.
Según el reporte que se mire, el mismo informe se le asigna a personas distintas.

Se requiere mostrar y registrar correctamente:

- a los profesionales que elaboran el informe (residentes o médicos de planta),
- al profesional que valida,
- la firma de cada uno,
- todos ellos en el informe final.

Debe contemplarse: elaboración y validación por la misma persona (firma única), elaboración
por residente y validación por otro, elaboración por varios residentes con una única
validación del médico de planta, informes históricos y modificación de informes existentes.

Hoy el sistema no tiene el concepto de residente ni una lista de residentes. Un usuario es
un login (`AuthUsers`, con permisos Shiro) vinculado a un `Profesional` (matrícula, firmas)
por `documento == username`.

## Decisión

### Quién puede qué

1. **Pre-validar** (firmar antes de la validación): un usuario que sea **profesional**
   (tiene un `Profesional` asociado en su sesión) y que tenga el permiso Shiro
   `rup:prevalidacion:<tipoPrestacion>`. Este permiso es el que se asigna a los
   médicos residentes. (Enmienda 2026-10-19: antes la pre-validación estaba abierta
   a cualquier profesional; ahora requiere el permiso explícito.)
2. **Validar:** cualquier profesional que hoy pueda validar la prestación (creador, o quien
   tiene `rup:validacion:<tipoPrestacion>` para validar prestaciones ajenas), **salvo** que
   tenga `rup:prevalidacion:<tipoPrestacion>`. (Enmienda 2026-10-31: `rup:validacion` NO es
   requisito para validar; nunca lo fue. Ese permiso habilita abrir y validar prestaciones de
   otros en el punto de inicio. Exigirlo para el botón "Validar" fue una regresión: ocultaba el
   botón a médicos que validaban sus propias prestaciones sin ese permiso.)
3. Un profesional con `rup:prevalidacion` **solo puede pre-validar**: tener ese permiso es,
   para el sistema, lo que define al residente. Por convención administrativa, un usuario no
   debería tener `rup:prevalidacion` y `rup:validacion` a la vez; si los tuviera, la
   derivación de rol da prioridad a validador y la API **rechaza** la pre-validación (debe
   validar directo). Enmienda 2026-10-21.

### Rol derivado de permisos (en esta etapa)

No existe una lista de residentes. Por eso el rol del firmante **se deriva de los permisos**
y no se agrega ningún atributo a `Profesional` en esta etapa:

- Firma con permiso de validación: figura como validador (médico de planta).
- Firma sin permiso de validación: figura como firma previa (residente).

La derivación está encapsulada en `deriveRolFirmante(req, tipoPrestacionId)`
(`modules/rup/controllers/prestacion.ts`): devuelve `'validador'` si el usuario tiene
`rup:validacion:<tipo>`, `'prevalidador'` en caso contrario. Es el único punto a tocar
si más adelante se agrega un atributo explícito de rol en `Profesional`.

El rol que se calculó al firmar se **guarda en la propia firma** (snapshot). Si los permisos
de la persona cambian después, los informes ya firmados conservan el rol que tenía al firmar.

La derivación debe estar encapsulada en un único punto del código, de modo que agregar más
adelante un atributo explícito en `Profesional` (la opción híbrida evaluada) no obligue a
tocar a los consumidores.

### Modelo de datos

- `firmasPrevalidacion`: **lista** de firmas previas. Cada una guarda el profesional
  (`id`, `nombre`, `apellido`, `documento`), el rol (snapshot), las **matrículas** vigentes
  (snapshot en texto, obtenidas con `searchMatriculas` y con el mismo formato que el pie del
  informe PDF: `Título MP 123 - Especialidad ME 456`) y la fecha.
  **Implementado** (`modules/rup/schemas/prestacion.ts`, subschema `FirmaPrevalidacionSchema`).
- `firmaValidacion`: **una sola** firma, con la misma forma. **Diferido en esta etapa:**
  como la validación no se modifica (ver enmienda 2026-10-19), el validador se deriva en
  lectura de `estadoActual.createdBy` del estado `validada` (igual que para firma única e
  informes históricos). El campo propio se agregará cuando se decida tocar el flujo de validación.
- Las firmas previas no se derivan de `estados[]`, porque un estado tiene un único
  `createdBy`. Todas las firmas son rastreables.
- **La pre-validación no cambia el estado** (enmienda 2026-10-31). La prestación sigue en
  `ejecucion` y acumula firmas en `firmasPrevalidacion`; varios residentes pueden sumar la
  suya (`$push` atómico con anti-duplicado y tope en el filtro). La cantidad de firmas se
  muestra como **badge** sobre la prestación en los listados del punto de inicio (agenda,
  sobreturnos y fuera de agenda) y en el panel de firmas de la pantalla de validación.
  **Reemplaza** al estado `pendienteValidacion` de la etapa 1: los usuarios reportaron que un
  estado nuevo les generaba problemas en los flujos existentes (acciones del punto de inicio
  gateadas por `ejecucion`, filtros, reportes) y saturaba la pantalla junto con la cola
  dedicada. El estado se eliminó del enum sin migración: no llegó a producción.

Flujo:

```
ejecucion (0..4 firmas de pre-validación) ──(valida)──► validada   [doble firma o firma única]
```

- **Quitar pre-validación** (op `quitarPrevalidacion`, análoga a `romperValidacion`): saca una
  firma de `firmasPrevalidacion` (p. ej. el residente se equivocó). La puede quitar el propio
  firmante o un validador (`rup:validacion`); quitar la firma de otro sin ese permiso se
  rechaza. Solo con la prestación en `ejecucion`. `$pull` atómico condicionado a que la firma
  exista. El estado no cambia.
- **Romper validación** (op `romperValidacion`): la prestación vuelve a `ejecucion` y
  `firmasPrevalidacion` se limpia, porque las firmas avalaban el contenido validado. Quedan en
  la copia de `prestacionesHistorial`; si corresponde, los residentes vuelven a pre-validar.
- El validador puede corregir el contenido antes de validar. No hay rechazo ni devolución.
- Cualquier médico con el permiso puede validar; no se asigna un validador específico.
- En la firma única, el validador no tiene firmas previas y se muestra una sola firma.

### Reglas del conjunto de firmas

- **Tope:** hasta 4 firmas previas (residentes) y 1 validador (médico de planta). Se hace
  cumplir en la API, no solo en la interfaz. El valor vive en `config.ts`
  (`rup.maxFirmasPrevalidacion`) y la app lo obtiene de
  `GET /api/modules/rup/prevalidacion/config` → `{ maxFirmasPrevalidacion }`, para no duplicarlo.
- **Concurrencia:** las firmas previas se agregan de forma atómica (`$push`); varios
  residentes pueden firmar al mismo tiempo y ninguna se puede perder.
- **Sin duplicados:** un mismo profesional no puede figurar dos veces.

### Presentación en el PDF

- Orden: primero los residentes (firmas previas), al final el médico de planta (validador).
- Layout dinámico que escala con la cantidad de firmas sin desbordar la página.

### Estadísticas

- **Reportes institucionales:** cuentan informes (prestaciones), no firmantes. No se ven
  afectados por la cantidad de firmas.
- **Reportes por profesional:** cuentan los informes en los que participó el profesional,
  como firmante previo o como validador, y cada uno suma el informe completo (no se
  reparte). El fin es académico: el residente debe poder demostrar cuántos informes e
  intervenciones tuvo.

## Alternativas consideradas

| Alternativa | Resultado |
|---|---|
| **Solo perfil de permisos** (residente = profesional sin `rup:validacion`) | **Adoptada para esta etapa.** Evita tocar el schema core `Profesional` y no exige cargar una lista que no existe. Riesgo en "Consecuencias". |
| **Híbrida:** atributo de rol en `Profesional` para el rótulo, permiso para la capacidad, snapshot en la firma | Evaluada primero y aceptada. Se pospone porque no existe una lista de residentes para poblar el atributo. Es la evolución prevista si el riesgo de rótulo erróneo se materializa. |
| **Solo atributo en `Profesional`** | Descartada: crea dos fuentes de verdad (rol y permisos) que pueden desincronizarse, y sin snapshot cambiar el rol reescribiría los informes históricos. |

## Consecuencias

**Positivas**

- Una sola fuente de verdad (los permisos); no hay desincronización posible entre rol y
  capacidad.
- No se modifica el schema core de `Profesional` ni hace falta migrarlo.
- Los informes firmados son estables en el tiempo (snapshot).
- Los informes históricos no requieren migración: sin `firmasPrevalidacion` ni
  `firmaValidacion`, se resuelve en lectura con el validador como único firmante
  (`estadoActual.createdBy`).

**Negativas / a vigilar**

- **Rótulo implícito.** "Profesional sin permiso de validación" no equivale a "residente".
  El requisito de ser profesional descarta a administrativos, pero un profesional que no sea
  médico (por ejemplo de otra disciplina) con acceso a RUP y sin el permiso figuraría como
  residente. Mitigación: el snapshot, y mostrar el rol por función si hace falta. Si el
  problema aparece, se pasa a la opción híbrida.
- **La API hoy no exige `rup:validacion` para validar.** Se verificó que el permiso solo se
  consulta en la API al romper una validación (`routes/prestacion.ts`, op `romperValidacion`);
  la operación `estadoPush` con `validada` no lo chequea. Hoy el control es solo visual en
  la app (botón). La asociación del profesional con tipos de prestación
  (`rup:tipoPrestacion:<id>`) tampoco lo cubre: filtra listados y es un permiso distinto
  (puede trabajar con el tipo, no puede validarlo), y `PATCH /prestaciones/:id` no lo
  consulta. Hacer cumplir la regla en la API es parte de este cambio, y puede
  **cortar flujos que hoy validan sin el permiso** (por ejemplo internación, que ya se
  exceptúa en `romperValidacion` con `desdeInternacion`). Hay que relevarlos antes de
  activar el control.
  - **Decisión 2026-10-19 (revertida el 2026-10-31):** se había gateado el botón "Validar"
    de `prestacionValidacion` por `rup:validacion:<tipo>`. Eso materializó el riesgo de arriba:
    médicos que validaban sus propias prestaciones sin `rup:validacion` dejaron de ver el
    botón. Se revierte.
  - **Decisión 2026-10-31:** el botón "Validar" se muestra como antes de la doble firma, y se
    oculta **únicamente** a quien tiene `rup:prevalidacion:<tipo>` (residente). El backend
    (`estadoPush` con `validada`) sigue sin exigir permiso alguno, y la validación de
    internación (`listado-internacion`, flujo propio por egreso) queda **sin tocar**. El
    enforcement real en la API sigue pendiente de relevamiento.
  - **UI excluyente:** el botón "Pre-validar" no se muestra a quien tiene `rup:validacion`
    (un médico de planta valida directo, no pre-valida), reforzando en la interfaz la
    convención de que ambos permisos son excluyentes.

> **Observación — principio general de gateo (importante).**
> La pre-validación es una capacidad de acceso de **primera clase**, no un caso aparte.
> Históricamente, muchos puntos del código gatean el acceso a una prestación por
> «la creó el usuario actual **o** tiene `rup:validacion`». Todo gateo de ese tipo debe
> contemplar **además** `rup:prevalidacion`, o el residente queda afuera de prestaciones
> que debería poder abrir, continuar y pre-validar. Esto aplica de forma transversal:
> listados, apertura/continuación de prestaciones y acciones, tanto **por agenda** como
> **fuera de agenda**. Casos ya corregidos en el punto de inicio RUP: el filtro de
> «fuera de agenda», `checkPuedeValidar` y `tienePermisos`. Al tocar cualquier flujo que
> decida visibilidad o acciones sobre una prestación, revisar que la condición incluya los
> tres: creador, validador (`rup:validacion`) y pre-validador (`rup:prevalidacion`).
- Las consultas de estadísticas por profesional deben considerar tanto `firmasPrevalidacion`
  como `firmaValidacion`, y conviene indexar ambos campos.
- El snapshot duplica un dato a propósito; es el costo de la estabilidad histórica.

## Alcance y puntos abiertos

Pendiente de definir:

- Orden de las firmas entre los residentes (se propone orden de firma).
- Relevamiento de flujos que validan sin el permiso, antes de hacer cumplir la regla en la API.
- Cómo se muestra el rol en el informe (rótulo "Residente" o por función).

## Historial de cambios del documento

| Fecha | Cambio |
|---|---|
| 2026-10-01 | Versión inicial. Decisión híbrida aceptada. |
| 2026-10-01 | Corregido el contexto tras verificar contra el código: la atribución no es siempre al validador, es inconsistente entre reportes. |
| 2026-10-01 | Se agrega el caso de varios residentes: las firmas previas pasan a ser una lista y la validación sigue siendo una. |
| 2026-10-01 | Decididos: tope de firmas, producción completa para cada firmante, trazabilidad por lista propia, layout dinámico. |
| 2026-10-01 | Confirmado el tope: 4 firmas previas (residentes) + 1 validador (médico de planta). |
| 2026-10-01 | Confirmados el estado `pendienteValidacion` y los nombres `firmasPrevalidacion` / `firmaValidacion`. El rol pasa a derivarse de permisos en esta etapa (no hay lista de residentes); la opción híbrida queda como evolución. Se documentan las reglas de quién pre-valida y valida, y que la API hoy no exige el permiso para validar. Orden del PDF: residentes primero, planta al final. Estadísticas: institucional por informes, por profesional por participación. |
| 2026-10-01 | Precisado que `rup:tipoPrestacion` no reemplaza al control de `rup:validacion` en la API. |
| 2026-10-19 | Visibilidad en punto de inicio RUP: el residente (permiso `rup:prevalidacion`) ve y puede continuar/pre-validar prestaciones que no creó, tanto fuera de agenda como por agenda (antes el filtro solo contemplaba creador o permiso de validación). |
| 2026-10-19 | Implementación etapa 1. Pre-validar pasa a requerir el permiso explícito `rup:prevalidacion:<tipo>` (el que tendrán los residentes); rol sigue derivándose de permisos vía `deriveRolFirmante`. Se implementan `firmasPrevalidacion` (lista, `$push` atómico, tope 4, anti-duplicado), el estado `pendienteValidacion` (admite pre-firmar en `ejecucion` o `pendienteValidacion`) y el permiso en `permisos.ts`. `firmaValidacion` se difiere: la validación NO se modifica y el validador se deriva de `estadoActual.createdBy`. Enforcement de validación: solo UI ambulatoria (botón gateado por `rup:validacion`); internación sin tocar; backend sin exigir el permiso. |
| 2026-10-21 | Ubicación: `docs/rup/`, con metadata (`tags`, `scope`) en front matter. Tope de firmas movido a `config.ts`. La API rechaza la pre-validación de usuarios con `rup:validacion`. Matrícula de la firma vía `searchMatriculas` (vigencia, posgrado, matrícula externa). `quitarPrevalidacion` rechaza quitar firmas ajenas sin permiso de validación. |
| 2026-10-21 | Resuelto el punto abierto de `romperValidacion`: al volver a `ejecucion` se limpian las firmas de pre-validación (quedan en el historial). |
| 2026-10-31 | Feedback de usuarios. (1) Se elimina la cola "Pendientes de validación" del punto de inicio: saturaba la pantalla junto con agendas y fuera de agenda. (2) Se elimina el estado `pendienteValidacion`: la pre-validación ya no cambia el estado, la prestación sigue en `ejecucion` y los listados muestran un badge con la cantidad de firmas; `quitarPrevalidacion` opera en `ejecucion` y no transiciona. (3) Se revierte el gate de "Validar" por `rup:validacion` (regresión: ocultaba el botón a médicos que validaban sin ese permiso); ahora solo se oculta a quien tiene `rup:prevalidacion`. |
