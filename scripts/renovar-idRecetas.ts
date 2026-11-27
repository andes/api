/**
 * Script de renovación de idRecetas.
 *
 * Migra recetas vigentes/pendientes con formato viejo (20 caracteres) o sin idReceta
 * al nuevo formato (13 caracteres: YYMMSSSSSSSSSP).
 *
 * Ejecución (desde la raíz del repo api/):
 *   - Con el launcher del repo: node scripts/index.js renovar-idRecetas [--dry-run] [--estados=vigente,pendiente]
 *   - Standalone:               node scripts/renovar-idRecetas.js [--dry-run] [--estados=vigente,pendiente]
 *
 * Ejemplo:
 *   node scripts/index.js renovar-idRecetas --dry-run
 *   node scripts/index.js renovar-idRecetas --estados=vigente
 *   node scripts/index.js renovar-idRecetas
 */

import * as fs from 'fs';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import { Receta } from '../modules/recetas/receta-schema';
import { generarIdSecuencial } from '../modules/recetas/recetasController';

interface Opciones {
    dryRun: boolean;
    estados: string[];
}

interface RegistroMigracion {
    recetaId: string;
    idRecetaAnterior: string | null;
    idRecetaNuevo: string;
    fecha: string;
}

interface Stats {
    total: number;
    migradas: number;
    sinIdReceta: number;
    formatoViejo: number;
    errores: number;
}

function parsearArgumentos(args: string[]): Opciones {
    const opciones: Opciones = { dryRun: false, estados: ['vigente', 'pendiente'] };
    for (const arg of args) {
        if (arg === '--dry-run') {
            opciones.dryRun = true;
        } else if (arg.startsWith('--estados=')) {
            opciones.estados = arg.split('=')[1].split(',').map(e => e.trim());
        }
    }
    return opciones;
}

function imprimirEncabezado(texto: string): void {
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('==================================================================');
    // eslint-disable-next-line no-console
    console.log(`  ${texto}`);
    // eslint-disable-next-line no-console
    console.log('==================================================================');
}

async function renovarIdRecetas(opciones: Opciones): Promise<Stats> {
    const stats: Stats = { total: 0, migradas: 0, sinIdReceta: 0, formatoViejo: 0, errores: 0 };
    const registros: RegistroMigracion[] = [];

    // Buscar recetas vigentes/pendientes sin idReceta o con formato viejo
    const query = {
        'estadoActual.tipo': { $in: opciones.estados },
        $or: [
            { idReceta: { $exists: false } },
            { idReceta: null },
            { idReceta: { $regex: /^\d{20}$/ } } // Formato viejo: 20 caracteres
        ]
    };

    // Usar cursor con select para reducir uso de memoria
    // select: solo trae los campos necesarios
    // cursor: procesa de a 100 documentos por vez en lugar de cargar todos
    // NOTA: No se usa lean() porque necesitamos .save() para persistir cambios
    const cursor = Receta.find(query)
        .select('idReceta estadoActual fechaRegistro createdAt')
        .cursor({ batchSize: 100 });

    imprimirEncabezado('RENOVACIÓN DE IDRECETAS');
    // eslint-disable-next-line no-console
    console.log(`Modo: ${opciones.dryRun ? 'DRY-RUN (sin cambios)' : 'PRODUCCIÓN'}`);
    // eslint-disable-next-line no-console
    console.log(`Estados: ${opciones.estados.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log('Procesando recetas...\n');

    for await (const receta of cursor) {
        stats.total++;
        try {
            const idAnterior = receta.idReceta || null;

            if (!idAnterior) {
                stats.sinIdReceta++;
            } else {
                stats.formatoViejo++;
            }

            // Generar nuevo idReceta
            const nuevoId = await generarIdSecuencial(receta.createdAt || new Date(), 0);

            const registro: RegistroMigracion = {
                recetaId: String(receta._id),
                idRecetaAnterior: idAnterior,
                idRecetaNuevo: nuevoId,
                fecha: new Date().toISOString()
            };
            registros.push(registro);

            if (!opciones.dryRun) {
                // Guardar id anterior en idRecetaV1 solo si existía
                if (idAnterior) {
                    receta.set('idRecetaV1', idAnterior);
                }
                receta.idReceta = nuevoId;
                Auth.audit(receta, userScheduler as any);
                await receta.save();
            }

            stats.migradas++;
            if (stats.migradas % 100 === 0 || stats.total <= 10) {
                // eslint-disable-next-line no-console
                console.log(`[${opciones.dryRun ? 'DRY-RUN' : 'OK'}] Procesadas: ${stats.migradas} recetas`);
            }
        } catch (error) {
            stats.errores++;
            // eslint-disable-next-line no-console
            console.error(`[ERROR] ${receta._id}: ${(error as Error).message}`);
        }
    }

    // Guardar archivo de respaldo
    const archivoSalida = `scripts/renovar-idRecetas-${Date.now()}.json`;
    fs.writeFileSync(archivoSalida, JSON.stringify({ opciones, stats, registros }, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\nArchivo de respaldo: ${archivoSalida}`);

    // Estadísticas finales
    // eslint-disable-next-line no-console
    console.log('\n=== Estadísticas ===');
    // eslint-disable-next-line no-console
    console.log(`Total: ${stats.total}`);
    // eslint-disable-next-line no-console
    console.log(`Migradas: ${stats.migradas}`);
    // eslint-disable-next-line no-console
    console.log(`Sin idReceta previo: ${stats.sinIdReceta}`);
    // eslint-disable-next-line no-console
    console.log(`Con formato viejo: ${stats.formatoViejo}`);
    // eslint-disable-next-line no-console
    console.log(`Errores: ${stats.errores}`);

    return stats;
}

async function run(done?: () => void): Promise<void> {
    let args = process.argv.slice(2);
    const archivoEjecutado = process.argv[1] || '';
    // Cuando se corre vía scripts/index.js o jobs/manual.js, el primer
    // argumento es el nombre del script y hay que descartarlo.
    const viaLauncher = archivoEjecutado.endsWith('index.js') || archivoEjecutado.endsWith('manual.js');
    if (viaLauncher && args.length) {
        args = args.slice(1);
    }

    const opciones = parsearArgumentos(args);

    try {
        await renovarIdRecetas(opciones);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error durante la renovación:', error);
    }

    if (done) {
        done();
    }
}

export = run;

// Permite ejecución directa: node scripts/renovar-idRecetas.js
if (require.main === module) {
    run().catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
