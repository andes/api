/**
 * Migración M1 (plan mapa-agenda-colores): copia `color` de conceptos turneables
 * a documentos `mapa-agenda-colores` con alcance `global`. No modifica conceptoTurneable.
 *
 * Uso (desde api/):
 *   npm run tsc
 *   node jobs/manual.js scripts/mapa-agenda-colores-migrar-concepto-turneable
 *   node jobs/manual.js scripts/mapa-agenda-colores-migrar-concepto-turneable --dry-run
 *
 * Equivalente por entorno: DRY_RUN=1 o DRY_RUN=true
 */

import { tipoPrestacion } from '../core/tm/schemas/tipoPrestacion';
import { MapaAgendaColores } from '../modules/turnos/mapa-agenda-colores/mapa-agenda-colores.schema';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

interface ConceptoTurneableConColor {
    conceptId: string;
    term?: string;
    fsn?: string;
    semanticTag?: string;
    color?: string;
}

function isDryRun(): boolean {
    if (process.argv.includes('--dry-run')) {
        return true;
    }
    const env = process.env.DRY_RUN;
    return env === '1' || env === 'true';
}

async function existeReglaGlobal(conceptId: string): Promise<boolean> {
    const found = await MapaAgendaColores.findOne({
        'concepto.conceptId': conceptId,
        alcance: 'global'
    })
        .select('_id')
        .lean();
    return Boolean(found);
}

function esColorHexValido(color: string): boolean {
    return Boolean(color) && HEX_COLOR_REGEX.test(color);
}

async function run(done: () => void) {
    const dryRun = isDryRun();
    const stats = {
        scanned: 0,
        created: 0,
        skippedDuplicate: 0,
        skippedInvalid: 0,
        errors: 0
    };

    if (dryRun) {
        // eslint-disable-next-line no-console
        console.log('[dry-run] No se persistirán cambios en mapa-agenda-colores.');
    }

    const cursor = tipoPrestacion
        .find({
            color: { $exists: true, $nin: [null, ''] },
            conceptId: { $exists: true, $nin: [null, ''] }
        })
        .cursor({ batchSize: 100 });

    for await (const raw of cursor) {
        const ct = raw.toObject() as ConceptoTurneableConColor;
        stats.scanned++;
        const color = String(ct.color || '').trim();

        if (!esColorHexValido(color)) {
            stats.skippedInvalid++;
            // eslint-disable-next-line no-console
            console.warn(`[skip-invalid] conceptId=${ct.conceptId} color=${JSON.stringify(ct.color)}`);
            continue;
        }

        if (await existeReglaGlobal(ct.conceptId)) {
            stats.skippedDuplicate++;
            // eslint-disable-next-line no-console
            console.log(`[skip-duplicate] conceptId=${ct.conceptId}`);
            continue;
        }

        const payload = {
            concepto: {
                conceptId: ct.conceptId,
                term: ct.term,
                fsn: ct.fsn,
                semanticTag: ct.semanticTag
            },
            color,
            alcance: 'global' as const,
            activo: true
        };

        if (dryRun) {
            stats.created++;
            // eslint-disable-next-line no-console
            console.log(`[dry-run] crear global conceptId=${ct.conceptId} color=${color}`);
            continue;
        }

        try {
            const doc = new MapaAgendaColores(payload);
            await doc.save();
            stats.created++;
            // eslint-disable-next-line no-console
            console.log(`[created] conceptId=${ct.conceptId} color=${color}`);
        } catch (err: any) {
            if (err?.code === 11000) {
                stats.skippedDuplicate++;
                // eslint-disable-next-line no-console
                console.log(`[skip-duplicate] conceptId=${ct.conceptId} (índice único)`);
            } else {
                stats.errors++;
                // eslint-disable-next-line no-console
                console.error(`[error] conceptId=${ct.conceptId}`, err);
            }
        }
    }

    // eslint-disable-next-line no-console
    console.log('Resumen:', stats);
    done();
}

export = run;
