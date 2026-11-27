/* eslint-disable no-console */
/**
 * Crea 5 agendas (lun–vie de la semana calendario actual) a partir de configuración,
 * sin clonar una agenda existente por _id.
 *
 * Configuración (una de estas opciones):
 *   1) Copiar seed-agendas-semana-actual.config.example.json → seed-agendas-semana-actual.config.json
 *   2) --config=/ruta/al.json
 *   3) Variables de entorno: ORGANIZACION_ID, CONCEPT_ID (y opcional CONFIG_PATH)
 *
 * Uso (desde api/):
 *   npm run tsc
 *   node jobs/manual.js scripts/seed-agendas-semana-actual
 *   node jobs/manual.js scripts/seed-agendas-semana-actual --dry-run
 *   node jobs/manual.js scripts/seed-agendas-semana-actual --organizacion=<id> --concept-id=168537006
 */

import * as fs from 'fs';
import { Types } from 'mongoose';
import * as path from 'path';
import { Auth } from '../auth/auth.class';
import { Organizacion } from '../core/tm/schemas/organizacion';
import { tipoPrestacion } from '../core/tm/schemas/tipoPrestacion';
import * as agendaCtrl from '../modules/turnos/controller/agenda';
import { Agenda } from '../modules/turnos/schemas/agenda';

interface BloqueConfig {
    horaInicio: string;
    horaFin: string;
    cantidadTurnos: number;
    duracionTurno: number;
    accesoDirectoDelDia?: number;
    accesoDirectoProgramado?: number;
    reservadoGestion?: number;
    reservadoProfesional?: number;
    cupoMobile?: number;
    pacienteSimultaneos?: boolean;
    cantidadSimultaneos?: number;
    citarPorBloque?: boolean;
    turnosMobile?: boolean;
    cantidadBloque?: number;
}

interface SeederConfig {
    organizacionId: string;
    conceptId?: string;
    prestacionId?: string;
    estado?: string;
    intercalar?: boolean;
    enviarSms?: boolean;
    nominalizada?: boolean;
    dinamica?: boolean;
    multiprofesional?: boolean;
    profesionales?: unknown[];
    bloque: BloqueConfig;
}

/** Valores por defecto del bloque (misma lógica que el ejemplo de config). */
const DEFAULT_BLOQUE: BloqueConfig = {
    horaInicio: '08:00',
    horaFin: '12:00',
    cantidadTurnos: 10,
    duracionTurno: 24,
    accesoDirectoDelDia: 0,
    accesoDirectoProgramado: 10,
    reservadoGestion: 0,
    reservadoProfesional: 0,
    cupoMobile: 0,
    pacienteSimultaneos: true,
    cantidadSimultaneos: 5,
    citarPorBloque: false,
    turnosMobile: false,
};

function argValue(flag: string): string | undefined {
    const prefix = `--${flag}=`;
    const fromArgv = process.argv.find(a => a.startsWith(prefix));
    if (fromArgv) {
        return fromArgv.slice(prefix.length);
    }
    const envKey = flag.replace(/-/g, '_').toUpperCase();
    return process.env[envKey];
}

function parseArgs() {
    const dryRun = process.argv.includes('--dry-run');
    const configPath =
        argValue('config') ||
        process.env.CONFIG_PATH ||
        path.join(__dirname, 'seed-agendas-semana-actual.config.json');
    const organizacionId = argValue('organizacion') || process.env.ORGANIZACION_ID;
    const conceptId = argValue('concept-id') || process.env.CONCEPT_ID;
    const prestacionId = argValue('prestacion-id') || process.env.PRESTACION_ID;
    const estadoOverride = argValue('estado');
    return { dryRun, configPath, organizacionId, conceptId, prestacionId, estadoOverride };
}

function loadConfig(configPath: string, overrides: Partial<SeederConfig>): SeederConfig {
    let base: Partial<SeederConfig> = {};
    if (fs.existsSync(configPath)) {
        base = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const merged: SeederConfig = {
        ...base,
        ...overrides,
        bloque: {
            ...DEFAULT_BLOQUE,
            ...(base as SeederConfig).bloque,
            ...overrides.bloque,
        },
    } as SeederConfig;

    if (overrides.organizacionId) {
        merged.organizacionId = overrides.organizacionId;
    }
    if (overrides.conceptId) {
        merged.conceptId = overrides.conceptId;
    }
    if (overrides.prestacionId) {
        merged.prestacionId = overrides.prestacionId;
    }

    if (!merged.organizacionId) {
        throw new Error('Falta organizacionId (config JSON, --organizacion= o ORGANIZACION_ID)');
    }
    if (!merged.conceptId && !merged.prestacionId) {
        throw new Error('Falta conceptId o prestacionId (config, --concept-id= / --prestacion-id= o env)');
    }
    if (!merged.bloque?.horaInicio || !merged.bloque?.horaFin) {
        throw new Error('Falta bloque.horaInicio / bloque.horaFin en la configuración');
    }
    if (!merged.bloque.cantidadTurnos || !merged.bloque.duracionTurno) {
        throw new Error('Falta bloque.cantidadTurnos / bloque.duracionTurno en la configuración');
    }
    return merged;
}

function fechasLunesAViernesSemanaActual(ref: Date = new Date()): Date[] {
    const lunes = new Date(ref);
    const diaSemana = lunes.getDay();
    const offsetAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    lunes.setDate(lunes.getDate() + offsetAlLunes);
    lunes.setHours(0, 0, 0, 0);

    const fechas: Date[] = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        fechas.push(d);
    }
    return fechas;
}

function horaEnDia(fechaDia: Date, hhmm: string): Date {
    const [horas, minutos] = hhmm.split(':').map(n => parseInt(n, 10));
    return agendaCtrl.combinarFechas(fechaDia, new Date(1970, 0, 1, horas, minutos, 0, 0));
}

function generarTurnos(fechaDia: Date, bloque: any, tipoPrestaciones: any[]) {
    const turnos: any[] = [];
    const bloqueInicio = horaEnDia(fechaDia, bloque._horaInicioStr);
    const bloqueFin = horaEnDia(fechaDia, bloque._horaFinStr);
    bloque.horaInicio = bloqueInicio;
    bloque.horaFin = bloqueFin;

    if (bloque.pacienteSimultaneos) {
        bloque.restantesDelDia = bloque.accesoDirectoDelDia * bloque.cantidadSimultaneos;
        bloque.restantesProgramados = bloque.accesoDirectoProgramado * bloque.cantidadSimultaneos;
        bloque.restantesGestion = bloque.reservadoGestion * bloque.cantidadSimultaneos;
        bloque.restantesProfesional = bloque.reservadoProfesional * bloque.cantidadSimultaneos;
        bloque.restantesMobile = bloque.accesoDirectoProgramado > 0 ? bloque.cupoMobile * bloque.cantidadSimultaneos : 0;
    } else {
        bloque.restantesDelDia = bloque.accesoDirectoDelDia;
        bloque.restantesProgramados = bloque.accesoDirectoProgramado;
        bloque.restantesGestion = bloque.reservadoGestion;
        bloque.restantesProfesional = bloque.reservadoProfesional;
        bloque.restantesMobile = bloque.accesoDirectoProgramado > 0 ? bloque.cupoMobile : 0;
    }

    const auditable = !tipoPrestaciones.some(p => !p.auditable);
    const videoConferencia = tipoPrestaciones.some(p => p.videoConferencia === true);

    for (let i = 0; i < bloque.cantidadTurnos; i++) {
        const horaTurno = agendaCtrl.combinarFechas(
            fechaDia,
            new Date(bloqueInicio.getTime() + i * bloque.duracionTurno * 60000)
        );
        const turnoBase = {
            _id: new Types.ObjectId(),
            estado: 'disponible',
            horaInicio: horaTurno,
            tipoTurno: undefined,
            auditable,
            videoConferencia,
            diagnostico: { codificaciones: [] },
        };

        if (bloque.pacienteSimultaneos) {
            for (let j = 0; j < bloque.cantidadSimultaneos; j++) {
                turnos.push({ ...turnoBase, _id: new Types.ObjectId(), horaInicio: new Date(horaTurno) });
            }
        } else if (bloque.citarPorBloque) {
            for (let j = 0; j < bloque.cantidadBloque; j++) {
                const hi = agendaCtrl.combinarFechas(
                    fechaDia,
                    new Date(bloqueInicio.getTime() + i * bloque.duracionTurno * bloque.cantidadBloque * 60000)
                );
                if (hi.getTime() < bloqueFin.getTime() && turnos.length < bloque.cantidadTurnos) {
                    turnos.push({ ...turnoBase, _id: new Types.ObjectId(), horaInicio: hi });
                }
            }
        } else {
            turnos.push(turnoBase);
        }
    }

    bloque.turnos = turnos;
    bloque.tipoPrestaciones = tipoPrestaciones;
    delete bloque._horaInicioStr;
    delete bloque._horaFinStr;
    return bloque;
}

function buildBloqueFromConfig(cfg: BloqueConfig, tipoPrestaciones: any[]) {
    const bloque: any = {
        _id: new Types.ObjectId(),
        _horaInicioStr: cfg.horaInicio,
        _horaFinStr: cfg.horaFin,
        cantidadTurnos: cfg.cantidadTurnos,
        duracionTurno: cfg.duracionTurno,
        accesoDirectoDelDia: cfg.accesoDirectoDelDia ?? 0,
        accesoDirectoProgramado: cfg.accesoDirectoProgramado ?? 0,
        reservadoGestion: cfg.reservadoGestion ?? 0,
        reservadoProfesional: cfg.reservadoProfesional ?? 0,
        cupoMobile: cfg.cupoMobile ?? 0,
        pacienteSimultaneos: cfg.pacienteSimultaneos ?? false,
        cantidadSimultaneos: cfg.cantidadSimultaneos,
        citarPorBloque: cfg.citarPorBloque ?? false,
        turnosMobile: cfg.turnosMobile ?? false,
        cantidadBloque: cfg.cantidadBloque,
    };
    return bloque;
}

function buildAgendaDocument(
    fechaDia: Date,
    config: SeederConfig,
    organizacion: { _id: Types.ObjectId; nombre: string },
    tipoPrestaciones: any[]
) {
    const bloqueRaw = buildBloqueFromConfig(config.bloque, tipoPrestaciones);
    const bloque = generarTurnos(fechaDia, bloqueRaw, tipoPrestaciones);

    const horaInicio = bloque.horaInicio;
    const horaFin = bloque.horaFin;

    return new Agenda({
        organizacion: { _id: organizacion._id, nombre: organizacion.nombre },
        tipoPrestaciones,
        profesionales: config.profesionales ?? [],
        horaInicio,
        horaFin,
        intercalar: config.intercalar ?? false,
        estado: config.estado ?? 'publicada',
        bloques: [bloque],
        sobreturnos: [],
        nominalizada: config.nominalizada ?? true,
        enviarSms: config.enviarSms ?? true,
        dinamica: config.dinamica ?? false,
        multiprofesional: config.multiprofesional ?? false,
        historial: [],
    });
}

function buildAuditRequest(organizacion: { _id: Types.ObjectId | string; nombre?: string }) {
    const orgId = organizacion._id;
    return {
        user: {
            usuario: {
                id: '000000000000000000000000',
                nombreCompleto: 'Seeder agendas semana actual',
                nombre: 'Seeder',
                apellido: 'Script',
                username: 'seeder',
                documento: '0',
            },
            organizacion: {
                _id: orgId,
                id: String(orgId),
                nombre: organizacion.nombre,
            },
        },
    } as any;
}

async function resolvePrestacion(config: SeederConfig) {
    if (config.prestacionId) {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const doc = await tipoPrestacion.findById(config.prestacionId).lean();
        if (!doc) {
            throw new Error(`No existe prestación con id ${config.prestacionId}`);
        }
        return doc;
    }
    const doc = await tipoPrestacion.findOne({ conceptId: config.conceptId }).lean();
    if (!doc) {
        throw new Error(`No existe conceptoTurneable con conceptId ${config.conceptId}`);
    }
    return doc;
}

async function run(done: () => void) {
    const { dryRun, configPath, organizacionId, conceptId, prestacionId, estadoOverride } = parseArgs();

    let config: SeederConfig;
    try {
        config = loadConfig(configPath, {
            organizacionId,
            conceptId,
            prestacionId,
            estado: estadoOverride,
        } as Partial<SeederConfig>);
    } catch (err) {
        console.error(String(err.message || err));
        console.error('Copiá scripts/seed-agendas-semana-actual.config.example.json → seed-agendas-semana-actual.config.json y editá los valores.');
        return done();
    }

    const org = await Organizacion.findById(config.organizacionId, { nombre: 1 }).lean();
    if (!org) {
        console.error('No existe organización', config.organizacionId);
        return done();
    }

    const prestacion = await resolvePrestacion(config);
    const tipoPrestaciones = [prestacion];
    const fechas = fechasLunesAViernesSemanaActual();
    const req = buildAuditRequest(org as any);

    console.log('Config:', configPath);
    console.log('Organización:', org.nombre, org._id);
    console.log('Prestación:', (prestacion as any).term || (prestacion as any).fsn, '| conceptId:', (prestacion as any).conceptId);
    console.log('Estado:', config.estado ?? 'publicada');
    console.log('Semana objetivo (lun–vie):');
    fechas.forEach(f => console.log('  -', f.toISOString(), f.toLocaleDateString('es-AR', { weekday: 'long' })));

    if (dryRun) {
        console.log('Dry-run: no se insertaron documentos.');
        return done();
    }

    const creadas: string[] = [];

    for (const fechaDia of fechas) {
        const nueva = buildAgendaDocument(fechaDia, config, org as any, tipoPrestaciones);

        const solapamiento = await agendaCtrl.verificarSolapamiento(nueva);
        if (solapamiento.tipoError) {
            console.warn('Solapamiento en', fechaDia.toISOString(), solapamiento);
            continue;
        }

        Auth.audit(nueva, req);
        try {
            const guardada: any = await agendaCtrl.saveAgenda(nueva);
            creadas.push(String(guardada._id));
            console.log(
                'Creada agenda',
                guardada._id,
                '| turnos:',
                guardada.bloques[0].turnos.length,
                '|',
                guardada.horaInicio,
                '→',
                guardada.horaFin
            );
        } catch (err) {
            console.error('Error al guardar agenda para', fechaDia.toISOString(), err);
        }
    }

    console.log('Total creadas:', creadas.length, creadas.length ? creadas.join(', ') : '(ninguna)');
    done();
}

export = run;
