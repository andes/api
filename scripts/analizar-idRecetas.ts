/**
 * Análisis de idRecetas con formato viejo.
 *
 * Lee la base de datos y reporta cuántas recetas tienen:
 *   - Sin idReceta
 *   - Formato viejo (20 caracteres: YYYYMMDDHHmmssmmmRRR)
 *   - Formato nuevo (13 caracteres: YYMMSSSSSSSSSP)
 *   - Formato desconocido
 *
 * Ejecución (desde la raíz del repo api/):
 *   - Con el launcher del repo: node scripts/index.js analizar-idRecetas [--estados=vigente,pendiente]
 *   - Standalone:               node scripts/analizar-idRecetas.js [--estados=vigente,pendiente]
 *
 * Ejemplo:
 *   node scripts/index.js analizar-idRecetas
 *   node scripts/index.js analizar-idRecetas --estados=vigente,pendiente,vencida
 */

import { Receta } from '../modules/recetas/receta-schema';

interface Estadisticas {
    total: number;
    sinId: number;
    formatoViejo: number;
    formatoNuevo: number;
    formatoDesconocido: number;
    ejemplosViejos: Array<{
        _id: string;
        idReceta: string;
        fechaRegistro: Date | null;
        estado: string;
    }>;
    ejemplosDesconocidos: Array<{
        _id: string;
        idReceta: string;
        fechaRegistro: Date | null;
        estado: string;
    }>;
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

function analizarFormato(idReceta: string): 'viejo' | 'nuevo' | 'desconocido' {
    if (/^\d{20}$/.test(idReceta)) {
        return 'viejo';
    }
    if (/^\d{13}$/.test(idReceta)) {
        return 'nuevo';
    }
    return 'desconocido';
}

async function analizarIdRecetas(estados: string[]): Promise<Estadisticas> {
    const query = {
        'estadoActual.tipo': { $in: estados }
    };

    const estadisticas: Estadisticas = {
        total: 0,
        sinId: 0,
        formatoViejo: 0,
        formatoNuevo: 0,
        formatoDesconocido: 0,
        ejemplosViejos: [],
        ejemplosDesconocidos: []
    };

    // Usar cursor con select y lean para reducir uso de memoria
    // select: solo trae los campos necesarios
    // lean: devuelve objetos plain JS (no documentos Mongoose, reduce memoria ~3x)
    // cursor: procesa de a 100 documentos por vez en lugar de cargar todos
    const cursor = Receta.find(query)
        .select('idReceta estadoActual fechaRegistro')
        .lean()
        .cursor({ batchSize: 100 });

    for await (const receta of cursor) {
        estadisticas.total++;

        if (!receta.idReceta) {
            estadisticas.sinId++;
        } else {
            const formato = analizarFormato(receta.idReceta);

            switch (formato) {
                case 'viejo':
                    estadisticas.formatoViejo++;
                    if (estadisticas.ejemplosViejos.length < 10) {
                        estadisticas.ejemplosViejos.push({
                            _id: String(receta._id),
                            idReceta: receta.idReceta,
                            fechaRegistro: receta.fechaRegistro || null,
                            estado: receta.estadoActual?.tipo || '?'
                        });
                    }
                    break;
                case 'nuevo':
                    estadisticas.formatoNuevo++;
                    break;
                case 'desconocido':
                    estadisticas.formatoDesconocido++;
                    if (estadisticas.ejemplosDesconocidos.length < 10) {
                        estadisticas.ejemplosDesconocidos.push({
                            _id: String(receta._id),
                            idReceta: receta.idReceta,
                            fechaRegistro: receta.fechaRegistro || null,
                            estado: receta.estadoActual?.tipo || '?'
                        });
                    }
                    break;
            }
        }
    }

    return estadisticas;
}

function imprimirResultados(estadisticas: Estadisticas, estados: string[]): void {
    imprimirEncabezado('ANÁLISIS DE IDRECETAS');

    // eslint-disable-next-line no-console
    console.log(`Estados consultados: ${estados.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log(`Total de recetas: ${estadisticas.total}\n`);

    // eslint-disable-next-line no-console
    console.log('--- Distribución por formato ---');
    // eslint-disable-next-line no-console
    console.log(`  Sin idReceta:              ${estadisticas.sinId}`);
    // eslint-disable-next-line no-console
    console.log(`  Formato viejo (20 chars):  ${estadisticas.formatoViejo}`);
    // eslint-disable-next-line no-console
    console.log(`  Formato nuevo (13 chars):  ${estadisticas.formatoNuevo}`);
    // eslint-disable-next-line no-console
    console.log(`  Formato desconocido:       ${estadisticas.formatoDesconocido}`);

    const totalAMigrar = estadisticas.sinId + estadisticas.formatoViejo;
    // eslint-disable-next-line no-console
    console.log(`\n  >>> Total a migrar: ${totalAMigrar}`);

    if (estadisticas.ejemplosViejos.length > 0) {
        // eslint-disable-next-line no-console
        console.log('\n--- Ejemplos de formato viejo (hasta 10) ---');
        estadisticas.ejemplosViejos.forEach(e => {
            // eslint-disable-next-line no-console
            console.log(`  - ${e._id}: ${e.idReceta} (${e.estado}, ${e.fechaRegistro})`);
        });
    }

    if (estadisticas.ejemplosDesconocidos.length > 0) {
        // eslint-disable-next-line no-console
        console.log('\n--- Ejemplos de formato desconocido (hasta 10) ---');
        estadisticas.ejemplosDesconocidos.forEach(e => {
            // eslint-disable-next-line no-console
            console.log(`  - ${e._id}: ${e.idReceta} (${e.estado}, ${e.fechaRegistro})`);
        });
    }
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

    let estados = ['vigente', 'pendiente'];
    for (const arg of args) {
        if (arg.startsWith('--estados=')) {
            estados = arg.split('=')[1].split(',').map(e => e.trim());
        }
    }

    try {
        const estadisticas = await analizarIdRecetas(estados);
        imprimirResultados(estadisticas, estados);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error durante el análisis:', error);
    }

    if (done) {
        done();
    }
}

export = run;

// Permite ejecución directa: node scripts/analizar-idRecetas.js
if (require.main === module) {
    run().catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
