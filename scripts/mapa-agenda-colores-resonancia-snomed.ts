/**
 * Genera reglas de color `global` para todo el árbol SNOMED de resonancia magnética.
 *
 * Estrategia:
 *   1. Obtiene los hijos directos de `113091000` (resonancia magnética).
 *   2. Para cada hijo busca TODOS sus descendientes (`<<conceptId`, incluye al hijo).
 *   3. Asigna a cada hijo un color distinto (determinístico) y lo propaga a todo su subárbol.
 *   4. Escribe un JSON listo para importar en la colección `mapa-agenda-colores`.
 *
 * Conflicto multi-jerarquía: un mismo conceptId puede aparecer en más de una rama
 * (p. ej. angiografías de miembro). Gana el primer hijo que lo asigna, en el orden
 * devuelto por el endpoint de children. Los conflictos quedan registrados en un
 * archivo aparte para revisión.
 *
 * Todos los documentos son `alcance: 'global'` (sin organización ni profesional).
 *
 * Uso (desde api/):
 *   npm run tsc
 *   node jobs/manual.js scripts/mapa-agenda-colores-resonancia-snomed
 *   node jobs/manual.js scripts/mapa-agenda-colores-resonancia-snomed --apply
 *   node jobs/manual.js scripts/mapa-agenda-colores-resonancia-snomed --apply --overwrite
 *   node jobs/manual.js scripts/mapa-agenda-colores-resonancia-snomed --solo-nuevos
 *
 * Flags:
 *   --apply        Inserta/actualiza en Mongo. Sin este flag sólo escribe JSON.
 *   --overwrite    Con --apply, pisa el color de reglas globales existentes.
 *   --solo-nuevos  El JSON excluye conceptId que ya tienen regla global en la colección.
 *   --out=<path>   Ruta del JSON de salida (default: scripts/output/...).
 *
 * Import manual del JSON (si no se usa --apply):
 *   mongoimport --db <db> --collection mapa-agenda-colores \
 *     --file scripts/output/mapa-agenda-colores-resonancia.json --jsonArray
 */

import * as fs from 'fs';
import * as path from 'path';
import { Auth } from '../auth/auth.class';
import { snomed } from '../config.private';
import { MapaAgendaColores } from '../modules/turnos/mapa-agenda-colores/mapa-agenda-colores.schema';
import { handleHttpRequest } from '../utils/requestHandler';

const PARENT_CONCEPT_ID = process.env.RESONANCIA_CONCEPT_ID || '113091000';
const PAGE_SIZE = 1000;
const MAX_REINTENTOS = 3;
const OUT_DIR = path.join(__dirname, 'output');
const DEFAULT_OUT_FILE = path.join(OUT_DIR, 'mapa-agenda-colores-resonancia.json');
const CONFLICTS_FILE = path.join(OUT_DIR, 'mapa-agenda-colores-resonancia-conflictos.json');

/** Usuario de auditoría para los documentos creados/modificados por el script. */
const AUDIT_USER = {
    user: {
        usuario: {
            nombre: 'Script',
            apellido: 'Mapa Agenda Colores Resonancia'
        },
        organizacion: {
            nombre: 'Script'
        }
    }
};

interface SnowstormConcept {
    conceptId: string;
    active?: boolean;
    fsn?: { term?: string };
    pt?: { term?: string };
    isLeafInferred?: boolean;
}

interface ConceptoAsignado {
    conceptId: string;
    term: string;
    fsn: string;
    semanticTag: string;
    color: string;
    rama: string;
}

interface Conflicto {
    conceptId: string;
    term: string;
    colorAplicado: string;
    ramaGanadora: string;
    ramaGanadoraTerm: string;
    ramaDescartada: string;
    ramaDescartadaTerm: string;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFlag(name: string): boolean {
    return process.argv.indexOf(name) >= 0;
}

function getOption(name: string): string | null {
    const prefix = `${name}=`;
    const arg = process.argv.filter((a) => a.indexOf(prefix) === 0)[0];
    return arg ? arg.substring(prefix.length) : null;
}

/**
 * Deriva el semanticTag del FSN, igual criterio que core/term/controller/snomed.snowstorm.ts
 */
function getSemanticTagFromFsn(fsn: string): string {
    if (!fsn) {
        return '';
    }
    const startAt = fsn.lastIndexOf('(');
    const endAt = fsn.lastIndexOf(')');
    if (startAt < 0 || endAt <= startAt) {
        return '';
    }
    return fsn.substring(startAt + 1, endAt);
}

/**
 * GET a Snowstorm con reintentos. `qs` se serializa con el módulo qs (useQuerystring).
 */
async function httpGet(url: string, qs: any = {}): Promise<any> {
    let ultimoError: any = null;
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
        try {
            const [status, body] = await handleHttpRequest({
                url: `${snomed.snowstormHost}/${url}`,
                json: true,
                useQuerystring: true,
                headers: {
                    'Accept-Language': 'es'
                },
                qs
            });
            if (status === 200) {
                return body;
            }
            ultimoError = new Error(`HTTP ${status} en ${url}`);
        } catch (err) {
            ultimoError = err;
        }
        if (intento < MAX_REINTENTOS) {
            await sleep(500 * intento);
        }
    }
    throw ultimoError || new Error(`No se pudo obtener ${url}`);
}

async function getHijos(): Promise<SnowstormConcept[]> {
    const hijos = await httpGet(
        `browser/${snomed.snowstormBranch}/concepts/${PARENT_CONCEPT_ID}/children`,
        { form: 'inferred', includeDescendantCount: false }
    );
    if (!Array.isArray(hijos) || hijos.length === 0) {
        throw new Error(`Sin hijos para ${PARENT_CONCEPT_ID} en ${snomed.snowstormBranch}`);
    }
    return hijos;
}

/**
 * Todos los descendientes de `conceptId`, incluyéndolo (`<<conceptId`), con paginación.
 */
async function getDescendientes(conceptId: string): Promise<SnowstormConcept[]> {
    const items: SnowstormConcept[] = [];
    let offset = 0;
    while (true) {
        const pagina = await httpGet(`${snomed.snowstormBranch}/concepts`, {
            ecl: `<<${conceptId} `,
            includeLeafFlag: false,
            form: 'inferred',
            offset,
            limit: PAGE_SIZE
        });
        const pageItems: SnowstormConcept[] = (pagina && pagina.items) || [];
        items.push(...pageItems);
        offset += pageItems.length;
        if (pageItems.length === 0 || offset >= Number(pagina.total)) {
            break;
        }
    }
    return items;
}

function hslToHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const lig = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (v: number) => {
        const hex = Math.round(v * 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Color determinístico por índice de rama. Ángulo dorado para que ramas
 * consecutivas queden lejos en el círculo cromático.
 */
function colorPorIndice(indice: number): string {
    const hue = (210 + indice * 137.508) % 360;
    return hslToHex(hue, 65, 45);
}

function normalizarConcepto(concept: SnowstormConcept): ConceptoAsignado | null {
    if (!concept || !concept.conceptId) {
        return null;
    }
    const fsn = concept.fsn && concept.fsn.term ? concept.fsn.term : '';
    const term = concept.pt && concept.pt.term ? concept.pt.term : fsn;
    return {
        conceptId: concept.conceptId,
        term,
        fsn,
        semanticTag: getSemanticTagFromFsn(fsn),
        color: '',
        rama: ''
    };
}

function writeJson(file: string, data: any) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function conceptosConReglaGlobal(ids: string[]): Promise<Map<string, any>> {
    if (ids.length === 0) {
        return new Map();
    }
    const docs = await MapaAgendaColores.find({
        alcance: 'global',
        'concepto.conceptId': { $in: ids }
    })
        .select('concepto.conceptId color activo')
        .lean();
    return new Map(docs.map((d: any) => [d.concepto.conceptId, d]));
}

async function run(done: () => void) {
    const apply = getFlag('--apply');
    const overwrite = getFlag('--overwrite');
    const soloNuevos = getFlag('--solo-nuevos');
    const outFile = getOption('--out') || DEFAULT_OUT_FILE;

    const stats = {
        ramas: 0,
        filasSnomed: 0,
        conceptosUnicos: 0,
        conflictos: 0,
        existentes: 0,
        aEscribir: 0,
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        errores: 0
    };

    // eslint-disable-next-line no-console
    console.log(`[snomed] host=${snomed.snowstormHost} branch=${snomed.snowstormBranch} parent=${PARENT_CONCEPT_ID}`);

    const hijos = await getHijos();
    stats.ramas = hijos.length;
    // eslint-disable-next-line no-console
    console.log(`[snomed] hijos directos: ${hijos.length}`);

    const asignados = new Map<string, ConceptoAsignado>();
    const conflictos: Conflicto[] = [];

    for (let i = 0; i < hijos.length; i++) {
        const hijo = hijos[i];
        const color = colorPorIndice(i);
        const descendientes = await getDescendientes(hijo.conceptId);
        stats.filasSnomed += descendientes.length;

        for (const raw of descendientes) {
            if (raw.active === false) {
                continue;
            }
            const concepto = normalizarConcepto(raw);
            if (!concepto) {
                continue;
            }
            const yaAsignado = asignados.get(concepto.conceptId);
            if (yaAsignado) {
                stats.conflictos++;
                conflictos.push({
                    conceptId: concepto.conceptId,
                    term: concepto.term,
                    colorAplicado: yaAsignado.color,
                    ramaGanadora: yaAsignado.rama,
                    ramaGanadoraTerm: hijos.find((h) => h.conceptId === yaAsignado.rama)?.pt?.term || '',
                    ramaDescartada: hijo.conceptId,
                    ramaDescartadaTerm: hijo.pt?.term || ''
                });
                continue;
            }
            concepto.color = color;
            concepto.rama = hijo.conceptId;
            asignados.set(concepto.conceptId, concepto);
        }

        // eslint-disable-next-line no-console
        console.log(`[rama ${i + 1}/${hijos.length}] ${hijo.conceptId} ${hijo.pt?.term || ''} color=${color} conceptos=${descendientes.length}`);
    }

    stats.conceptosUnicos = asignados.size;

    const payloads = Array.from(asignados.values())
        .sort((a, b) => a.conceptId.localeCompare(b.conceptId))
        .map((c) => ({
            concepto: {
                conceptId: c.conceptId,
                term: c.term,
                fsn: c.fsn,
                semanticTag: c.semanticTag
            },
            color: c.color,
            alcance: 'global' as const,
            activo: true
        }));

    // Estado actual en la colección (sólo lectura; sirve para reportar y para --solo-nuevos)
    const ids = payloads.map((p) => p.concepto.conceptId);
    const existentes = await conceptosConReglaGlobal(ids);
    stats.existentes = existentes.size;

    const payloadsNuevos = payloads.filter((p) => !existentes.has(p.concepto.conceptId));
    const salida = soloNuevos ? payloadsNuevos : payloads;
    stats.aEscribir = salida.length;

    writeJson(outFile, salida);
    if (conflictos.length > 0) {
        writeJson(CONFLICTS_FILE, conflictos);
    }

    // eslint-disable-next-line no-console
    console.log(`[json] ${outFile} (${salida.length} documentos)`);
    if (conflictos.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[conflictos] ${CONFLICTS_FILE} (${conflictos.length} conceptos multi-rama, gana el primer hijo)`);
    }

    if (!apply) {
        // eslint-disable-next-line no-console
        console.log('Resumen:', stats);
        // eslint-disable-next-line no-console
        console.log('[dry] No se modificó Mongo. Usar --apply para insertar/actualizar.');
        return done();
    }

    for (const payload of payloads) {
        const existente = existentes.get(payload.concepto.conceptId);
        if (existente && !overwrite) {
            stats.omitidos++;
            continue;
        }
        try {
            if (existente) {
                if (existente.color === payload.color && existente.activo === true) {
                    stats.omitidos++;
                    continue;
                }
                const doc = await MapaAgendaColores.findById(existente._id);
                if (!doc) {
                    stats.omitidos++;
                    continue;
                }
                doc.set('color', payload.color);
                doc.set('activo', true);
                Auth.audit(doc, AUDIT_USER as any);
                await doc.save();
                stats.actualizados++;
            } else {
                const doc = new MapaAgendaColores(payload);
                Auth.audit(doc, AUDIT_USER as any);
                await doc.save();
                stats.creados++;
            }
        } catch (err: any) {
            if (err?.code === 11000) {
                stats.omitidos++;
            } else {
                stats.errores++;
                // eslint-disable-next-line no-console
                console.error(`[error] conceptId=${payload.concepto.conceptId}`, err);
            }
        }
    }

    // eslint-disable-next-line no-console
    console.log('Resumen:', stats);
    return done();
}

export = run;
