/**
 * Librería de análisis de recetas de ANDES.
 *
 * Normaliza un export de MongoDB (EJSON) de la colección `receta` y lo
 * procesa con una serie de reglas para detectar recetas mal creadas o
 * con datos inconsistentes. El objetivo es poder diagnosticar casos en
 * los que una receta no aparece para dispensar (recetAR) o se ve "rara"
 * en ANDES.
 *
 * Las reglas están pensadas como una "librería de casos de error":
 * cada una tiene un id, una severidad, una descripción y una sugerencia
 * de reparación, para que un futuro script (p.ej. reparar-recetas) pueda
 * reutilizarlas.
 */

export interface Receta {
    _id?: any;
    idReceta?: string;
    organizacion?: any;
    profesional?: any;
    fechaRegistro?: Date;
    fechaPrestacion?: Date;
    idPrestacion?: string;
    idRegistro?: string;
    diagnostico?: any;
    medicamento?: any;
    dispensa?: any[];
    estados?: any[];
    estadoActual?: any;
    estadosDispensa?: any[];
    estadoDispensaActual?: any;
    paciente?: any;
    appNotificada?: any[];
    origenExterno?: any;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: any;
    updatedBy?: any;
    __v?: number;
    renovacion?: string;
}

export interface Hallazgo {
    regla: string;
    categoria: string;
    severidad: 'info' | 'warning' | 'error';
    nombre: string;
    recetaId: string;
    idReceta: string;
    medicamento: string;
    fechaRegistro: string;
    detalle: string;
}

export interface Grupo {
    idRegistro: string;
    conceptId: string;
    medicamento: string;
    tratamientoProlongado: boolean;
    tiempoTratamientoId: string | null;
    recetas: Receta[];
}

export interface ContextoRegla {
    hoy: Date;
    grupos: Grupo[];
    gruposPorReceta: Map<string, Receta[]>;
}

export interface Regla {
    id: string;
    categoria: string;
    nombre: string;
    severidad: 'info' | 'warning' | 'error';
    descripcion: string;
    sugerenciaReparacion: string;
    evaluar: (receta: Receta, contexto: ContextoRegla) => string | string[] | null;
}

export interface TratamientoResumen {
    idRegistro: string;
    conceptId: string;
    medicamento: string;
    tratamientoProlongado: boolean;
    tiempoTratamientoId: string | null;
    cantRecetas: number;
    ordenes: number[];
    estados: string[];
    estadosDispensa: string[];
    fechasRegistro: string[];
}

export interface ResumenAnalisis {
    total: number;
    porEstado: Record<string, number>;
    porEstadoDispensa: Record<string, number>;
    porOrigen: Record<string, number>;
    fechaRegistroMin: string;
    fechaRegistroMax: string;
    conIdReceta: number;
    conDispensa: number;
    conAppNotificada: number;
    tratamientos: TratamientoResumen[];
    dispensablesAhora: string[];
}

export interface ResultadoVisibilidad {
    desde: string;
    hasta: string;
    estadoConsultado: string;
    visibles: Array<Record<string, string>>;
    noVisibles: Array<Record<string, string>>;
}

const MS_DIA = 86400000;

export function aFecha(valor: any): Date | null {
    if (!valor) {
        return null;
    }
    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? null : valor;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function fmtFecha(valor: any): string {
    const fecha = aFecha(valor);
    if (!fecha) {
        return '-';
    }
    return fecha.toISOString();
}

/**
 * Convierte un export EJSON (de mongoexport/Compass) a estructuras JS
 * planas. Maneja {$oid}, {$date} y {$numberLong}, tanto anidados como
 * a nivel de arreglo.
 */
export function normalizarEJSON(valor: any): any {
    if (Array.isArray(valor)) {
        return valor.map(item => normalizarEJSON(item));
    }
    if (valor !== null && typeof valor === 'object') {
        const claves = Object.keys(valor);
        if (claves.length === 1 && claves[0] === '$oid') {
            return valor.$oid;
        }
        if (claves.length === 1 && claves[0] === '$numberLong') {
            return parseInt(valor.$numberLong, 10);
        }
        if (claves.includes('$date')) {
            const valorFecha = valor.$date;
            if (typeof valorFecha === 'string' || typeof valorFecha === 'number') {
                return new Date(valorFecha);
            }
            if (valorFecha && typeof valorFecha === 'object' && valorFecha.$numberLong) {
                return new Date(parseInt(valorFecha.$numberLong, 10));
            }
            return null;
        }
        const resultado: any = {};
        claves.forEach(clave => {
            resultado[clave] = normalizarEJSON(valor[clave]);
        });
        return resultado;
    }
    return valor;
}

export function parsearRecetas(contenido: string): Receta[] {
    const crudo = JSON.parse(contenido);
    const arreglo = Array.isArray(crudo) ? crudo : [crudo];
    return arreglo.map(item => normalizarEJSON(item) as Receta);
}

export function idRecetaDe(receta: Receta): string {
    return receta.idReceta || (receta._id ? String(receta._id) : '?');
}

export function medicamentoDe(receta: Receta): string {
    const concepto = receta.medicamento && receta.medicamento.concepto;
    return (concepto && (concepto.term || concepto.fsn)) || '?';
}

export function construirGrupos(recetas: Receta[]): Grupo[] {
    const mapa = new Map<string, Grupo>();
    recetas.forEach(receta => {
        const idRegistro = receta.idRegistro || '';
        const conceptId = (receta.medicamento && receta.medicamento.concepto && receta.medicamento.concepto.conceptId) || '';
        const clave = `${idRegistro}|${conceptId}`;
        if (!mapa.has(clave)) {
            const tiempoTratamiento = receta.medicamento && receta.medicamento.tiempoTratamiento;
            mapa.set(clave, {
                idRegistro,
                conceptId,
                medicamento: medicamentoDe(receta),
                tratamientoProlongado: !!(receta.medicamento && receta.medicamento.tratamientoProlongado),
                tiempoTratamientoId: (tiempoTratamiento && tiempoTratamiento.id !== null && tiempoTratamiento.id !== undefined) ? String(tiempoTratamiento.id) : null,
                recetas: []
            });
        }
        (mapa.get(clave) as Grupo).recetas.push(receta);
    });
    return Array.from(mapa.values());
}

function resumenTratamiento(grupo: Grupo): TratamientoResumen {
    return {
        idRegistro: grupo.idRegistro,
        conceptId: grupo.conceptId,
        medicamento: grupo.medicamento,
        tratamientoProlongado: grupo.tratamientoProlongado,
        tiempoTratamientoId: grupo.tiempoTratamientoId,
        cantRecetas: grupo.recetas.length,
        ordenes: grupo.recetas.map(receta => receta.medicamento && receta.medicamento.ordenTratamiento).sort((a, b) => a - b),
        estados: grupo.recetas.map(receta => (receta.estadoActual && receta.estadoActual.tipo) || '?'),
        estadosDispensa: grupo.recetas.map(receta => (receta.estadoDispensaActual && receta.estadoDispensaActual.tipo) || '?'),
        fechasRegistro: grupo.recetas.map(receta => fmtFecha(receta.fechaRegistro))
    };
}

export function resumenAnalisis(recetas: Receta[]): ResumenAnalisis {
    const porEstado: Record<string, number> = {};
    const porEstadoDispensa: Record<string, number> = {};
    const porOrigen: Record<string, number> = {};
    let conIdReceta = 0;
    let conDispensa = 0;
    let conAppNotificada = 0;
    let min: Date | null = null;
    let max: Date | null = null;

    recetas.forEach(receta => {
        const estado = (receta.estadoActual && receta.estadoActual.tipo) || 'sin-estado';
        porEstado[estado] = (porEstado[estado] || 0) + 1;
        const estadoDispensa = (receta.estadoDispensaActual && receta.estadoDispensaActual.tipo) || 'sin-estado';
        porEstadoDispensa[estadoDispensa] = (porEstadoDispensa[estadoDispensa] || 0) + 1;
        const origen = (receta.origenExterno && receta.origenExterno.app) || 'andes';
        porOrigen[origen] = (porOrigen[origen] || 0) + 1;
        if (receta.idReceta) {
            conIdReceta++;
        }
        if (receta.dispensa && receta.dispensa.length) {
            conDispensa++;
        }
        if (receta.appNotificada && receta.appNotificada.length) {
            conAppNotificada++;
        }
        const fechaRegistro = aFecha(receta.fechaRegistro);
        if (fechaRegistro) {
            if (!min || fechaRegistro < min) {
                min = fechaRegistro;
            }
            if (!max || fechaRegistro > max) {
                max = fechaRegistro;
            }
        }
    });

    const dispensables = recetas.filter(receta =>
        receta.estadoActual && receta.estadoActual.tipo === 'vigente' &&
        receta.estadoDispensaActual && receta.estadoDispensaActual.tipo === 'sin-dispensa'
    );

    return {
        total: recetas.length,
        porEstado,
        porEstadoDispensa,
        porOrigen,
        fechaRegistroMin: fmtFecha(min),
        fechaRegistroMax: fmtFecha(max),
        conIdReceta,
        conDispensa,
        conAppNotificada,
        tratamientos: construirGrupos(recetas).map(resumenTratamiento),
        dispensablesAhora: dispensables.map(idRecetaDe)
    };
}

/**
 * Simula la consulta que hace recetAR a ANDES para saber qué recetas
 * aparecerían para dispensar. RecetAR consulta /modules/recetas/filtros
 * con estado=vigente y, por defecto, la ventana de fechaRegistro es
 * [hoy - diasVigencia, hoy] (ver buscarRecetasConFiltros en el módulo
 * recetas de ANDES).
 */
export function analizarVisibilidad(recetas: Receta[], hoy: Date, diasVigencia = 30): ResultadoVisibilidad {
    const desde = new Date(hoy);
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - diasVigencia);
    const hasta = new Date(hoy);
    hasta.setHours(23, 59, 59, 999);

    const visibles: Array<Record<string, string>> = [];
    const noVisibles: Array<Record<string, string>> = [];

    recetas.forEach(receta => {
        const estado = (receta.estadoActual && receta.estadoActual.tipo) || '?';
        const estadoDispensa = (receta.estadoDispensaActual && receta.estadoDispensaActual.tipo) || '?';
        const fechaRegistro = aFecha(receta.fechaRegistro);
        const enVentana = !!fechaRegistro && fechaRegistro >= desde && fechaRegistro <= hasta;
        const coincideEstado = estado === 'vigente' || estadoDispensa === 'vigente';
        const info: Record<string, string> = {
            idReceta: idRecetaDe(receta),
            recetaId: String(receta._id),
            estado,
            estadoDispensa,
            fechaRegistro: fmtFecha(fechaRegistro),
            medicamento: medicamentoDe(receta)
        };
        if (coincideEstado && enVentana) {
            visibles.push(info);
        } else {
            const motivo = !enVentana ? 'fuera de ventana de fechas' : 'no coincide con estado=vigente';
            noVisibles.push({ ...info, motivo });
        }
    });

    return {
        desde: fmtFecha(desde),
        hasta: fmtFecha(hasta),
        estadoConsultado: 'vigente',
        visibles,
        noVisibles
    };
}

export function construirContexto(recetas: Receta[], hoy: Date): ContextoRegla {
    const grupos = construirGrupos(recetas);
    const gruposPorReceta = new Map<string, Receta[]>();
    grupos.forEach(grupo => {
        grupo.recetas.forEach(receta => {
            gruposPorReceta.set(String(receta._id), grupo.recetas);
        });
    });
    return { hoy, grupos, gruposPorReceta };
}

export function aplicarReglas(recetas: Receta[], contexto: ContextoRegla): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];
    recetas.forEach(receta => {
        reglas.forEach(regla => {
            let detalle: string | string[] | null;
            try {
                detalle = regla.evaluar(receta, contexto);
            } catch (err) {
                detalle = `Error al evaluar: ${(err as Error).message}`;
            }
            if (!detalle) {
                return;
            }
            const detalles = Array.isArray(detalle) ? detalle : [detalle];
            detalles.forEach(texto => {
                hallazgos.push({
                    regla: regla.id,
                    categoria: regla.categoria,
                    severidad: regla.severidad,
                    nombre: regla.nombre,
                    recetaId: String(receta._id),
                    idReceta: idRecetaDe(receta),
                    medicamento: medicamentoDe(receta),
                    fechaRegistro: fmtFecha(receta.fechaRegistro),
                    detalle: texto
                });
            });
        });
    });
    return hallazgos;
}

export const reglas: Regla[] = [
    {
        id: 'ESTRUCTURA-01',
        categoria: 'Estructura',
        nombre: 'estadoActual desincronizado con estados[]',
        severidad: 'error',
        descripcion: 'El campo estadoActual no coincide con el último elemento de estados[]. El hook pre("save") del schema mantiene ambos sincronizados; si difieren la receta quedó mal persistida.',
        sugerenciaReparacion: 'Reasignar estadoActual = estados[estados.length - 1] y guardar.',
        evaluar: (receta) => {
            const estados = receta.estados || [];
            const ultimo = estados[estados.length - 1];
            if (!receta.estadoActual) {
                return 'Falta estadoActual.';
            }
            if (!ultimo) {
                return null;
            }
            const difiereTipo = receta.estadoActual.tipo !== ultimo.tipo;
            const difiereId = receta.estadoActual._id && ultimo._id && String(receta.estadoActual._id) !== String(ultimo._id);
            if (difiereTipo || difiereId) {
                return `estadoActual=${receta.estadoActual.tipo} vs estados[]=${ultimo.tipo}.`;
            }
            return null;
        }
    },
    {
        id: 'ESTRUCTURA-02',
        categoria: 'Estructura',
        nombre: 'estadoDispensaActual desincronizado con estadosDispensa[]',
        severidad: 'error',
        descripcion: 'El campo estadoDispensaActual no coincide con el último elemento de estadosDispensa[].',
        sugerenciaReparacion: 'Reasignar estadoDispensaActual = estadosDispensa[estadosDispensa.length - 1] y guardar.',
        evaluar: (receta) => {
            const estadosDispensa = receta.estadosDispensa || [];
            const ultimo = estadosDispensa[estadosDispensa.length - 1];
            if (!receta.estadoDispensaActual) {
                return 'Falta estadoDispensaActual.';
            }
            if (!ultimo) {
                return null;
            }
            const difiereTipo = receta.estadoDispensaActual.tipo !== ultimo.tipo;
            const difiereId = receta.estadoDispensaActual._id && ultimo._id && String(receta.estadoDispensaActual._id) !== String(ultimo._id);
            if (difiereTipo || difiereId) {
                return `estadoDispensaActual=${receta.estadoDispensaActual.tipo} vs estadosDispensa[]=${ultimo.tipo}.`;
            }
            return null;
        }
    },
    {
        id: 'ESTRUCTURA-03',
        categoria: 'Estructura',
        nombre: 'Receta sin idReceta',
        severidad: 'warning',
        descripcion: 'idReceta es el identificador legible de la receta. Se autogenera al buscar; su ausencia sugiere que la receta nunca fue listada o quedó incompleta.',
        sugerenciaReparacion: 'Ejecutar script renovar-idRecetas para generar idReceta con el nuevo formato.',
        evaluar: (receta) => (receta.idReceta ? null : 'Receta sin idReceta.')
    },
    {
        id: 'IDRECETA-01',
        categoria: 'ID Receta',
        nombre: 'idReceta con formato viejo (20 caracteres)',
        severidad: 'warning',
        descripcion: 'El idReceta tiene el formato anterior YYYYMMDDHHmmssmmmRRR (20 caracteres). Debería migrarse al formato nuevo YYMMSSSSSSSSSP (13 caracteres).',
        sugerenciaReparacion: 'Ejecutar script renovar-idRecetas para migrar al formato nuevo.',
        evaluar: (receta) => {
            if (!receta.idReceta) {
                return null;
            }
            const id = receta.idReceta;
            if (/^\d{20}$/.test(id)) {
                return `idReceta="${id}" tiene formato viejo de 20 caracteres.`;
            }
            return null;
        }
    },
    {
        id: 'ESTRUCTURA-04',
        categoria: 'Estructura',
        nombre: 'Arrays de estados vacíos',
        severidad: 'error',
        descripcion: 'estados[] y/o estadosDispensa[] deben tener al menos un elemento al momento de crear la receta.',
        sugerenciaReparacion: 'Restaurar el estado inicial (vigente/sin-dispensa) o la transición faltante.',
        evaluar: (receta) => {
            const faltas: string[] = [];
            if (!receta.estados || receta.estados.length === 0) {
                faltas.push('estados[] vacío');
            }
            if (!receta.estadosDispensa || receta.estadosDispensa.length === 0) {
                faltas.push('estadosDispensa[] vacío');
            }
            return faltas.length ? faltas.join('; ') : null;
        }
    },
    {
        id: 'NEGOCIO-01',
        categoria: 'Negocio',
        nombre: 'Receta finalizada sin dispensa',
        severidad: 'error',
        descripcion: 'Una receta solo debería finalizar al dispensarse. finalizada + sin-dispensa es una contradicción.',
        sugerenciaReparacion: 'Verificar si hubo dispensa en el sistema externo; si no, restaurar el estado previo (vigente).',
        evaluar: (receta) => {
            const estado = receta.estadoActual && receta.estadoActual.tipo;
            const estadoDispensa = receta.estadoDispensaActual && receta.estadoDispensaActual.tipo;
            if (estado === 'finalizada' && estadoDispensa === 'sin-dispensa') {
                return 'Receta finalizada sin dispensa registrada.';
            }
            return null;
        }
    },
    {
        id: 'NEGOCIO-02',
        categoria: 'Negocio',
        nombre: 'Dispensada sin entrada en dispensa[]',
        severidad: 'error',
        descripcion: 'estadoDispensaActual indica dispensa pero no hay entrada coincidente en dispensa[].',
        sugerenciaReparacion: 'Reconstruir el arreglo dispensa[] a partir del origen externo o cancelar la dispensa fantasma.',
        evaluar: (receta) => {
            const estadoDispensa = receta.estadoDispensaActual && receta.estadoDispensaActual.tipo;
            if (estadoDispensa !== 'dispensada' && estadoDispensa !== 'dispensa-parcial') {
                return null;
            }
            const dispensas = receta.dispensa || [];
            if (dispensas.length === 0) {
                return `Estado ${estadoDispensa} pero dispensa[] vacío.`;
            }
            const idDispensaApp = receta.estadoDispensaActual && receta.estadoDispensaActual.idDispensaApp;
            if (idDispensaApp && !dispensas.some(d => String(d.idDispensaApp) === String(idDispensaApp))) {
                return `estadoDispensaActual.idDispensaApp=${idDispensaApp} no coincide con dispensa[].`;
            }
            return null;
        }
    },
    {
        id: 'NEGOCIO-03',
        categoria: 'Negocio',
        nombre: 'Dispensa sin medicamentos',
        severidad: 'info',
        descripcion: 'Entradas de dispensa[] con el arreglo medicamentos vacío. Puede ser normal si el sistema externo no envía el desglose, pero dificulta saber qué se dispensó.',
        sugerenciaReparacion: 'Completar medicamentos con los datos del medicamento de la receta si corresponde.',
        evaluar: (receta) => {
            const vacias = (receta.dispensa || []).filter(d => !d.medicamentos || d.medicamentos.length === 0);
            return vacias.length ? `dispensa[] con ${vacias.length} entrada(s) sin medicamentos.` : null;
        }
    },
    {
        id: 'NEGOCIO-04',
        categoria: 'Negocio',
        nombre: 'Estado vigente/vencida con dispensa',
        severidad: 'error',
        descripcion: 'Una receta vigente o vencida no debería tener dispensa registrada.',
        sugerenciaReparacion: 'Conciliar con el sistema externo el estado real de la dispensa.',
        evaluar: (receta) => {
            const estado = receta.estadoActual && receta.estadoActual.tipo;
            const estadoDispensa = receta.estadoDispensaActual && receta.estadoDispensaActual.tipo;
            if ((estado === 'vigente' || estado === 'vencida') && (estadoDispensa === 'dispensada' || estadoDispensa === 'dispensa-parcial')) {
                return `${estado} con estado de dispensa ${estadoDispensa}.`;
            }
            return null;
        }
    },
    {
        id: 'GRUPO-01',
        categoria: 'Tratamiento',
        nombre: 'ordenTratamiento faltante o duplicado en el grupo',
        severidad: 'error',
        descripcion: 'En un tratamiento prolongado las recetas del mismo idRegistro+conceptId deben tener ordenTratamiento 0..N-1 sin repetir.',
        sugerenciaReparacion: 'Renumerar ordenTratamiento en 0..N-1 preservando el orden por fechaRegistro.',
        evaluar: (receta, contexto) => {
            const grupo = contexto.gruposPorReceta.get(String(receta._id));
            if (!grupo || grupo.length < 2) {
                return null;
            }
            const ordenes = grupo
                .map(r => r.medicamento && r.medicamento.ordenTratamiento)
                .filter(n => typeof n === 'number')
                .sort((a, b) => a - b);
            const esperados = Array.from({ length: grupo.length }, (_, i) => i);
            const faltantes = esperados.filter(n => !ordenes.includes(n));
            const duplicados = ordenes.filter((n, i) => ordenes.indexOf(n) !== i);
            const mensajes: string[] = [];
            if (faltantes.length) {
                mensajes.push(`ordenTratamiento faltantes: ${faltantes.join(',')}`);
            }
            if (duplicados.length) {
                mensajes.push(`ordenTratamiento duplicados: ${duplicados.join(',')}`);
            }
            return mensajes.length ? mensajes.join('; ') : null;
        }
    },
    {
        id: 'GRUPO-02',
        categoria: 'Tratamiento',
        nombre: 'Cantidad de recetas del grupo distinta a tiempoTratamiento',
        severidad: 'warning',
        descripcion: 'Para un tratamiento prolongado se crean tantas recetas como meses indica tiempoTratamiento.id.',
        sugerenciaReparacion: 'Crear o eliminar las recetas faltantes/supernumerarias del tratamiento.',
        evaluar: (receta, contexto) => {
            const grupo = contexto.gruposPorReceta.get(String(receta._id));
            if (!grupo) {
                return null;
            }
            const medicamento = receta.medicamento || {};
            const tiempoTratamiento = medicamento.tiempoTratamiento;
            if (!medicamento.tratamientoProlongado || !tiempoTratamiento || tiempoTratamiento.id === null || tiempoTratamiento.id === undefined) {
                return null;
            }
            const esperado = parseInt(String(tiempoTratamiento.id), 10);
            if (!Number.isNaN(esperado) && grupo.length !== esperado) {
                return `Grupo con ${grupo.length} receta(s) pero tiempoTratamiento.id=${esperado}.`;
            }
            return null;
        }
    },
    {
        id: 'GRUPO-03',
        categoria: 'Tratamiento',
        nombre: 'Pendiente con fechaRegistro ya pasada (receta "pegada")',
        severidad: 'warning',
        descripcion: 'El job actualizarEstadosRecetas pasa las pendientes a vigentes cuando su fechaRegistro vence. Una pendiente con fechaRegistro pasada quedó "pegada" y no se ve para dispensar.',
        sugerenciaReparacion: 'Aplicar la transición pendiente -> vigente manualmente (o esperar el job si no corrió).',
        evaluar: (receta, contexto) => {
            if (!receta.estadoActual || receta.estadoActual.tipo !== 'pendiente') {
                return null;
            }
            const fechaRegistro = aFecha(receta.fechaRegistro);
            if (!fechaRegistro) {
                return null;
            }
            const dias = (contexto.hoy.getTime() - fechaRegistro.getTime()) / MS_DIA;
            if (dias > 2) {
                return `Pendiente con fechaRegistro ${fmtFecha(fechaRegistro)} hace ${Math.floor(dias)} días (debería haber pasado a vigente).`;
            }
            return null;
        }
    },
    {
        id: 'GRUPO-04',
        categoria: 'Tratamiento',
        nombre: 'Más de una receta vigente en el grupo',
        severidad: 'warning',
        descripcion: 'Solo la primera receta (orden 0) de un tratamiento debería estar vigente a la vez.',
        sugerenciaReparacion: 'Revisar los estados del grupo y dejar una única receta vigente.',
        evaluar: (receta, contexto) => {
            const grupo = contexto.gruposPorReceta.get(String(receta._id));
            if (!grupo || grupo.length < 2) {
                return null;
            }
            const vigentes = grupo.filter(r => r.estadoActual && r.estadoActual.tipo === 'vigente');
            if (vigentes.length > 1) {
                return `Grupo con ${vigentes.length} recetas vigentes simultáneas.`;
            }
            return null;
        }
    },
    {
        id: 'FECHAS-01',
        categoria: 'Fechas',
        nombre: 'fechaRegistro futura fuera de lo esperado',
        severidad: 'warning',
        descripcion: 'En un tratamiento prolongado las recetas se registran +30 días cada una. Una fechaRegistro mucho más allá de lo esperado (o más de 180 días posterior a createdAt) es anómala.',
        sugerenciaReparacion: 'Corregir fechaRegistro de la receta.',
        evaluar: (receta, contexto) => {
            const grupo = contexto.gruposPorReceta.get(String(receta._id));
            const fechaRegistro = aFecha(receta.fechaRegistro);
            if (grupo && grupo.length > 1 && fechaRegistro) {
                const fechas = grupo
                    .map(r => aFecha(r.fechaRegistro))
                    .filter((f): f is Date => !!f)
                    .map(f => f.getTime());
                if (fechas.length) {
                    const base = Math.min(...fechas);
                    const esperadoMax = base + (grupo.length - 1) * 30 * MS_DIA + 2 * MS_DIA;
                    if (fechaRegistro.getTime() > esperadoMax) {
                        return `fechaRegistro ${fmtFecha(fechaRegistro)} supera lo esperado para el tratamiento (base + ${(grupo.length - 1) * 30} días).`;
                    }
                }
            }
            const createdAt = aFecha(receta.createdAt);
            if (fechaRegistro && createdAt && (fechaRegistro.getTime() - createdAt.getTime()) > 180 * MS_DIA) {
                return `fechaRegistro ${fmtFecha(fechaRegistro)} más de 180 días posterior a createdAt ${fmtFecha(createdAt)}.`;
            }
            return null;
        }
    },
    {
        id: 'FECHAS-02',
        categoria: 'Fechas',
        nombre: 'fechaPrestacion faltante o posterior a fechaRegistro',
        severidad: 'warning',
        descripcion: 'fechaPrestacion debe existir y no ser posterior a fechaRegistro.',
        sugerenciaReparacion: 'Completar o corregir fechaPrestacion.',
        evaluar: (receta) => {
            if (!receta.fechaPrestacion) {
                return 'Falta fechaPrestacion.';
            }
            const fechaRegistro = aFecha(receta.fechaRegistro);
            const fechaPrestacion = aFecha(receta.fechaPrestacion);
            if (fechaRegistro && fechaPrestacion && fechaPrestacion.getTime() > fechaRegistro.getTime()) {
                return `fechaPrestacion ${fmtFecha(fechaPrestacion)} posterior a fechaRegistro ${fmtFecha(fechaRegistro)}.`;
            }
            return null;
        }
    },
    {
        id: 'FECHAS-03',
        categoria: 'Fechas',
        nombre: 'createdAt posterior a updatedAt',
        severidad: 'info',
        descripcion: 'Inconsistencia en la auditoría del documento.',
        sugerenciaReparacion: 'Revisar si hubo manipulación manual del documento.',
        evaluar: (receta) => {
            const createdAt = aFecha(receta.createdAt);
            const updatedAt = aFecha(receta.updatedAt);
            if (createdAt && updatedAt && createdAt.getTime() > updatedAt.getTime()) {
                return `createdAt ${fmtFecha(createdAt)} posterior a updatedAt ${fmtFecha(updatedAt)}.`;
            }
            return null;
        }
    },
    {
        id: 'DATOS-01',
        categoria: 'Datos',
        nombre: 'Medicamento incompleto',
        severidad: 'error',
        descripcion: 'El medicamento requiere conceptId, cantidad y cantEnvases para poder dispensarse.',
        sugerenciaReparacion: 'Completar los datos del medicamento según la prescripción original.',
        evaluar: (receta) => {
            const medicamento = receta.medicamento;
            if (!medicamento) {
                return 'Falta medicamento.';
            }
            const faltas: string[] = [];
            if (!medicamento.concepto || !medicamento.concepto.conceptId) {
                faltas.push('conceptId');
            }
            if (!medicamento.cantidad) {
                faltas.push('cantidad');
            }
            if (!medicamento.cantEnvases) {
                faltas.push('cantEnvases');
            }
            if (!medicamento.concepto || (!medicamento.concepto.term && !medicamento.concepto.fsn)) {
                faltas.push('concepto.term/fsn');
            }
            return faltas.length ? `Medicamento incompleto: ${faltas.join(', ')}.` : null;
        }
    },
    {
        id: 'DATOS-02',
        categoria: 'Datos',
        nombre: 'Profesional incompleto',
        severidad: 'warning',
        descripcion: 'El profesional debe tener documento, matrícula y profesión para validar la receta.',
        sugerenciaReparacion: 'Actualizar el profesional con los datos de su ficha en ANDES.',
        evaluar: (receta) => {
            const profesional = receta.profesional;
            if (!profesional) {
                return 'Falta profesional.';
            }
            const faltas: string[] = [];
            if (!profesional.documento) {
                faltas.push('documento');
            }
            if (!profesional.matricula) {
                faltas.push('matricula');
            }
            if (!profesional.profesion) {
                faltas.push('profesion');
            }
            return faltas.length ? `Profesional incompleto: ${faltas.join(', ')}.` : null;
        }
    },
    {
        id: 'DATOS-03',
        categoria: 'Datos',
        nombre: 'Faltan idPrestacion / idRegistro / organizacion',
        severidad: 'error',
        descripcion: 'Son campos obligatorios del schema de receta.',
        sugerenciaReparacion: 'Completar los campos faltantes con los datos del registro de origen.',
        evaluar: (receta) => {
            const faltas: string[] = [];
            if (!receta.idPrestacion) {
                faltas.push('idPrestacion');
            }
            if (!receta.idRegistro) {
                faltas.push('idRegistro');
            }
            if (!receta.organizacion) {
                faltas.push('organizacion');
            }
            return faltas.length ? `Faltan: ${faltas.join(', ')}.` : null;
        }
    },
    {
        id: 'NOTIF-01',
        categoria: 'Notificación',
        nombre: 'appNotificada presente en receta finalizada/vencida',
        severidad: 'info',
        descripcion: 'Una receta finalizada o vencida no debería seguir notificada a un sistema para dispensar.',
        sugerenciaReparacion: 'Limpiar appNotificada de las recetas no vigentes.',
        evaluar: (receta) => {
            const estado = receta.estadoActual && receta.estadoActual.tipo;
            const apps = receta.appNotificada || [];
            if ((estado === 'finalizada' || estado === 'vencida') && apps.length) {
                return `Receta ${estado} con appNotificada (${apps.map(a => a.app).join(',')}).`;
            }
            return null;
        }
    },
    {
        id: 'NOTIF-02',
        categoria: 'Notificación',
        nombre: 'estadoActual.organizacionExterna vacío',
        severidad: 'info',
        descripcion: 'Campo que solo existe en el schema y no se setea en el código de ANDES; un objeto vacío sugiere un alta/patch externo con estructura incompleta.',
        sugerenciaReparacion: 'Quitar el objeto vacío o completarlo con id/nombre de la organización externa.',
        evaluar: (receta) => {
            const oe = receta.estadoActual && receta.estadoActual.organizacionExterna;
            if (oe && typeof oe === 'object' && Object.keys(oe).length === 0) {
                return 'estadoActual.organizacionExterna presente pero vacío ({}).';
            }
            return null;
        }
    },
    {
        id: 'NOTIF-03',
        categoria: 'Notificación',
        nombre: 'Vigente sin dispensar sin appNotificada',
        severidad: 'warning',
        descripcion: 'La app (recetAR) solo ve las recetas que consultó (se registran en appNotificada). Una vigente sin appNotificada no aparecerá para dispensar hasta que algún sistema la consulte.',
        sugerenciaReparacion: 'Consultar la receta desde recetAR o verificar el origen de la receta.',
        evaluar: (receta) => {
            const estado = receta.estadoActual && receta.estadoActual.tipo;
            const estadoDispensa = receta.estadoDispensaActual && receta.estadoDispensaActual.tipo;
            if (estado === 'vigente' && estadoDispensa === 'sin-dispensa' && (!receta.appNotificada || receta.appNotificada.length === 0)) {
                return 'Receta vigente sin dispensar sin appNotificada (ningún sistema la ha consultado/notificado).';
            }
            return null;
        }
    }
];
