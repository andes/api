import { Receta } from '../modules/recetas/receta-schema';
import { informarLog, updateLog } from '../modules/recetas/recetaLogs';
import { actualizarAppNotificada, consultarEstado, dispensar } from '../modules/recetas/recetasController';

async function actualizarEstadosDispensa() {
    try {
        // Buscar recetas con appNotificada y sin dispensa
        const recetas: any = await Receta.find({
            appNotificada: { $exists: true },
            'estadoDispensaActual.tipo': 'sin-dispensa',
            'estadoActual.tipo': 'vigente'
        });


        if (!recetas || recetas.length === 0) {
            await informarLog.error('actualizarEstadosDispensa', {}, { message: 'No hay recetas para actualizar' });
        }

        const resultados = {
            total: recetas.length,
            dispensadas: 0,
            sinDispensa: 0,
            errores: 0
        };

        // Procesar cada receta
        for (const receta of recetas) {
            try {
                // Verificar cada app notificada
                for (const app of receta.appNotificada) {
                    const sistema = app.app;

                    // Consulta el estado de una receta en un sistema externo
                    const resultado = await consultarEstado(receta, sistema);

                    if (resultado.success) {
                        const { recetaDisp, tipo, dispensada } = resultado;

                        // Si la receta fue dispensada, actualizar estado
                        if (dispensada) {
                            recetaDisp.dispensas.forEach(async d => {
                                if (d.estado) {
                                    // Actualizar estado de dispensa
                                    await dispensar(receta, d.estado, d.dispensa, sistema);
                                    await receta.save();

                                    resultados.dispensadas++;
                                }
                            });
                        } else if (tipo === 'sin-dispensa') {
                            // Si no fue dispensada, eliminar del array appNotificada
                            const req = { user: { usuario: { nombre: 'JOB_ACTUALIZACION' } } };
                            await actualizarAppNotificada(receta.id, sistema, req);

                            resultados.sinDispensa++;
                        }
                    }
                }
            } catch (error) {
                resultados.errores++;
                await informarLog.error('actualizarEstadosDispensa', { recetaId: receta.id }, error);
            }
        }

        await updateLog.info('actualizarEstadosDispensa', { resultados });
    } catch (error) {
        await informarLog.error('actualizarEstadosDispensa', {}, error);
    }
}

function run(done) {
    actualizarEstadosDispensa().finally(() => done());
}

export = run;
