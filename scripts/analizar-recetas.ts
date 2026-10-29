/**
 * Parser de recetas de ANDES.
 *
 * Lee un export de MongoDB (EJSON) de la colección `receta` y produce:
 *   1. Un resumen general de las recetas (estados, dispensas, origen,
 *      tratamientos, rango de fechas).
 *   2. Los hallazgos de la librería de reglas (recetas mal creadas o
 *      inconsistentes).
 *   3. Una simulación de qué recetas vería recetAR para dispensar.
 *
 * Ejecución (desde la raíz del repo `api/`):
 *   - Standalone (sin conexión a la base): node scripts/analizar-recetas.js <archivo.json> [--out <salida.json>]
 *   - Con el launcher del repo:                  node scripts/index.js analizar-recetas <archivo.json> [--out <salida.json>]
 *
 * Ejemplo:
 *   node scripts/analizar-recetas.js ../querys-descargadas/andes.receta.11711233.json
 */

import * as fs from 'fs';
import {
    aplicarReglas,
    analizarVisibilidad,
    construirContexto,
    fmtFecha,
    Hallazgo,
    parsearRecetas,
    resumenAnalisis
} from './reglas-recetas';

interface Opciones {
    archivo: string | null;
    salida: string | null;
}

function parsearArgumentos(args: string[]): Opciones {
    const opciones: Opciones = { archivo: null, salida: null };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--out' || arg === '-o') {
            opciones.salida = args[i + 1] || null;
            i++;
        } else if (arg.startsWith('-')) {
            // flag no reconocido, se ignora
        } else if (!opciones.archivo) {
            opciones.archivo = arg;
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

function imprimirSeccion(titulo: string, cuerpo: string): void {
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`[${titulo}]`);
    // eslint-disable-next-line no-console
    console.log(cuerpo);
}

function imprimirResumen(recetas: any[], opciones: Opciones): void {
    const resumen = resumenAnalisis(recetas);
    imprimirSeccion('Resumen general', [
        `Archivo: ${opciones.archivo}`,
        `Total de recetas: ${resumen.total}`,
        `Por estadoActual: ${Object.entries(resumen.porEstado).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Por estadoDispensaActual: ${Object.entries(resumen.porEstadoDispensa).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Por origenExterno.app: ${Object.entries(resumen.porOrigen).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Rango fechaRegistro: ${resumen.fechaRegistroMin} -> ${resumen.fechaRegistroMax}`,
        `Con idReceta: ${resumen.conIdReceta} de ${resumen.total}`,
        `Con dispensa[]: ${resumen.conDispensa} de ${resumen.total}`,
        `Con appNotificada: ${resumen.conAppNotificada} de ${resumen.total}`,
        `Dispensables ahora (vigente + sin-dispensa): ${resumen.dispensablesAhora.length ? resumen.dispensablesAhora.join(', ') : 'ninguna'}`
    ].join('\n'));

    imprimirSeccion('Tratamientos (grupos por idRegistro + conceptId)', resumen.tratamientos.map(t =>
        `- ${t.medicamento} (idRegistro=${t.idRegistro.slice(0, 12)}, conceptId=${t.conceptId})` +
        `\n    tratamientoProlongado=${t.tratamientoProlongado}, tiempoTratamiento.id=${t.tiempoTratamientoId}, recetas=${t.cantRecetas}` +
        `\n    ordenes: ${t.ordenes.join(',')}` +
        `\n    estados: ${t.estados.join(',')}` +
        `\n    estadosDispensa: ${t.estadosDispensa.join(',')}` +
        `\n    fechaRegistro: ${t.fechasRegistro.join(',')}`
    ).join('\n'));
}

function imprimirVisibilidad(recetas: any[], hoy: Date): void {
    const resultado = analizarVisibilidad(recetas, hoy);
    imprimirSeccion(`Visibilidad recetAR (estado=${resultado.estadoConsultado}, ventana ${resultado.desde} -> ${resultado.hasta})`, [
        'Recetas que recetAR VERÍA para dispensar:',
        ...(resultado.visibles.length ? resultado.visibles.map(v =>
            `  - ${v.idReceta} (${v.medicamento}) estado=${v.estado}, dispensa=${v.estadoDispensa}, fechaRegistro=${v.fechaRegistro}`
        ) : ['  - ninguna']),
        '',
        'Recetas que NO aparecerían (y motivo):',
        ...(resultado.noVisibles.length ? resultado.noVisibles.map(v =>
            `  - ${v.idReceta} (${v.medicamento}) estado=${v.estado}, dispensa=${v.estadoDispensa}, fechaRegistro=${v.fechaRegistro} -> ${v.motivo}`
        ) : ['  - ninguna'])
    ].join('\n'));
}

function imprimirHallazgos(hallazgos: Hallazgo[]): void {
    const conteoPorRegla: Record<string, number> = {};
    hallazgos.forEach(h => {
        conteoPorRegla[h.regla] = (conteoPorRegla[h.regla] || 0) + 1;
    });

    imprimirSeccion(`Hallazgos (${hallazgos.length})`, [
        'Resumen por regla:',
        ...Object.entries(conteoPorRegla).sort((a, b) => b[1] - a[1]).map(([regla, n]) => `  ${regla}: ${n}`),
        '',
        'Detalle:',
        ...hallazgos.map(h =>
            `  [${h.severidad}] ${h.regla} - ${h.nombre} | idReceta=${h.idReceta} (${h.recetaId}) | ${h.medicamento} | fechaRegistro=${h.fechaRegistro}` +
            `\n      ${h.detalle}`
        )
    ].join('\n'));
}

async function analizar(opciones: Opciones): Promise<void> {
    if (!opciones.archivo) {
        // eslint-disable-next-line no-console
        console.log('Uso: node scripts/analizar-recetas.js <archivo.json> [--out <salida.json>]');
        return;
    }
    if (!fs.existsSync(opciones.archivo)) {
        // eslint-disable-next-line no-console
        console.error(`No existe el archivo: ${opciones.archivo}`);
        process.exitCode = 1;
        return;
    }

    const contenido = fs.readFileSync(opciones.archivo, 'utf8');
    const recetas = parsearRecetas(contenido);
    const hoy = new Date();
    const contexto = construirContexto(recetas, hoy);
    const hallazgos = aplicarReglas(recetas, contexto);
    const resumen = resumenAnalisis(recetas);
    const visibilidad = analizarVisibilidad(recetas, hoy);

    imprimirEncabezado('ANÁLISIS DE RECETAS DE ANDES');
    imprimirResumen(recetas, opciones);
    imprimirVisibilidad(recetas, hoy);
    imprimirHallazgos(hallazgos);

    const salida = opciones.salida || (opciones.archivo.replace(/\.json$/i, '') + '-resultado.json');
    const resultado = {
        archivo: opciones.archivo,
        fechaAnalisis: fmtFecha(hoy),
        resumen,
        visibilidad,
        hallazgos,
        conteoPorRegla: hallazgos.reduce<Record<string, number>>((acc, h) => {
            acc[h.regla] = (acc[h.regla] || 0) + 1;
            return acc;
        }, {})
    };
    fs.writeFileSync(salida, JSON.stringify(resultado, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`Resultado guardado en: ${salida}`);
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
    await analizar(opciones);
    if (done) {
        done();
    }
}

export = run;

// Permite ejecución directa: node scripts/analizar-recetas.js <archivo.json>
if (require.main === module) {
    run().catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
