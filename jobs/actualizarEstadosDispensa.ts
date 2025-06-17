import { Receta } from '../modules/recetas/receta-schema';
import { jobsLog } from '../modules/recetas/recetaLogs';
import { actualizarDispensa, consultarDispensa } from '../modules/recetas/recetasController';
import { userScheduler } from '../config.private';
import { Auth } from '../auth/auth.class';

async function actualizarEstadosDispensa() {
    // Buscar recetas con appNotificada y sin dispensa
    const recetas: any = await Receta.find({
        'estadoActual.tipo': 'vigente',
        'estadoDispensaActual.tipo': 'sin-dispensa',
        'appNotificada.app': { $exists: true },
    }).cursor({ batchSize: 100 });

    const resultados = {
        dispensadas: 0,
        sinDispensa: 0,
        enUso: 0, // Recetas que están en uso y no se pueden actualizar
        errores: 0
    };
    // Procesar cada receta
    for await (let receta of recetas) {
        try {
            // Verificar cada app notificada
            for (const app of receta.appNotificada) {
                const sistema = app.app;

                // Consulta el estado de una receta en un sistema externo
                const resultado = await consultarDispensa(receta, sistema);

                if (resultado.success) {
                    const { dispensas, tipo, dispensada } = resultado;
                    const indiceApp = receta.appNotificada.findIndex(a => a.app === sistema);

                    receta = await actualizarDispensa(receta, dispensada, dispensas, tipo, sistema, indiceApp);
                    // Si la receta fue dispensada, actualizar estado
                    if (tipo === 'dispensada') {
                        resultados.dispensadas++;
                    } else if (tipo === 'sin-dispensa') {
                        resultados.sinDispensa++;
                    } else {
                        resultados.enUso++;
                    }
                }
            }
            Auth.audit(receta, (userScheduler as any));
            await receta.save();
        } catch (error) {
            resultados.errores++;
            await jobsLog.error('job-actualizarEstadosDispensaJOB', { recetaId: receta.id }, error);
        }
    }
    await jobsLog.info('job-actualizarEstadosDispensa', { resultados });
}

function run(done) {
    actualizarEstadosDispensa().finally(() => done());
}

export = run;
