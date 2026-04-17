// /* eslint-disable no-console */
// import { MongoQuery, ResourceBase } from '@andes/core';
// import { Auth } from '../../../auth/auth.class';
// import { InformeEstadistica } from './informe-estadistica.schema';
// import { EventCore } from '@andes/event-bus';
// import { Request, Response } from 'express';
// import { Types } from 'mongoose';
// import { asyncHandler } from '@andes/api-tool';
// class InformeEstadisticaResource extends ResourceBase {
//     Model = InformeEstadistica;
//     resourceModule = 'internacion';
//     resourceName = 'informe-estadistica';
//     keyId = '_id';
//     middlewares = [Auth.authenticate()];
//     searchFields = {
//         paciente: {
//             field: 'paciente.id',
//             fn: MongoQuery.equalMatch
//         },
//         organizacion: {
//             field: 'organizacion._id',
//             fn: MongoQuery.equalMatch
//         },
//         fechaIngreso: {
//             field: 'informeIngreso.fechaIngreso',
//             fn: (value) => MongoQuery.matchDate(value)
//         },
//         fechaEgreso: {
//             field: 'informeEgreso.fechaEgreso',
//             fn: (value) => MongoQuery.matchDate(value)
//         },
//         estadoActual: {
//             field: 'estadoActual.tipo',
//             fn: MongoQuery.equalMatch
//         },
//         estadoHistorico: {
//             field: 'estados.tipo',
//             fn: MongoQuery.equalMatch
//         },
//         search: ['nroCarpeta', 'paciente.apellido', 'paciente.nombre']
//     };

//     export const updateInformeEspecial = async (req: Request, res: Response) => {
//         const id = req.params.id;
//         const data = req.body;

//         // Puedes usar la instancia de tu Resource para buscar y auditar
//         const resource = InformeEstadisticaCtr; // Renombramos para claridad

//         try {
//             const informe: any = await resource.Model.findById(id);

//             if (!informe) {
//                 throw new Error('Informe no encontrado');
//             }

//             const { op, estado, informeEgreso, periodosCensables } = data;

//             switch (op) {
//                 case 'estadoPush':
//                     if (!estado) {
//                         throw new Error('Faltan datos de estado en el DTO.');
//                     }

//                     // --- Validaciones (mantener la lógica original) ---
//                     const ultimoEstado = informe.estados[informe.estados.length - 1]?.tipo;

//                     if (ultimoEstado === 'anulada') {
//                         throw new Error('Informe anulado, no se puede modificar su estado.');
//                     }
//                     if (ultimoEstado === 'validada' && estado.tipo === 'validada') {
//                         throw new Error('Informe validado, no se puede volver a validar.');
//                     }

//                     // Manejo de anulación
//                     if (estado.tipo === 'anulada') {
//                         EventCore.emitAsync('internacion:informe:anular', informe);
//                     }

//                     // Agregar nuevo estado
//                     informe.estados.push({
//                         tipo: estado.tipo,
//                         fecha: estado.fecha || new Date()
//                     });
//                     informe.estadoActual = {
//                         tipo: estado.tipo,
//                         fecha: estado.fecha || new Date()
//                     };

//                     // Actualizar informeEgreso si se proporciona
//                     if (informeEgreso) {
//                         informe.informeEgreso = informeEgreso;
//                     }

//                     // Actualizar periodosCensables si se proporciona
//                     if (periodosCensables) {
//                         informe.periodosCensables = periodosCensables;
//                     }

//                     break;

//                 case 'informeEgreso':
//                     // Lógica de informeEgreso
//                     informe.informeEgreso = informeEgreso;
//                     break;

//                 case 'romperValidacion':
//                     // Lógica de romperValidacion
//                     // Por ejemplo, volver al estado 'ejecucion'
//                     if (informe.estadoActual.tipo !== 'validada') {
//                         throw new Error('El informe no está validado.');
//                     }
//                     informe.estados.push({
//                         tipo: 'ejecucion',
//                         fecha: new Date()
//                     });
//                     informe.estadoActual = {
//                         tipo: 'ejecucion',
//                         fecha: new Date()
//                     };
//                     EventCore.emitAsync('internacion:informe:ejecucion', informe);
//                     break;

//                 default:
//                     // Si 'op' no está presente o no es una operación especial, puedes lanzar un error o
//                     // simplemente no hacer nada y dejar que el PATCH default se encargue de las demás actualizaciones.
//                     // En este caso, lanzamos un error para forzar el uso de la ruta PATCH general.
//                     throw new Error('Operación no reconocida. Use la ruta PATCH general para actualizaciones simples.');
//             }

//             // Auditoría y guardado
//             Auth.audit(informe, req);
//             const resultado = await informe.save();

//             // Emitir eventos
//             if (data.estado?.tipo === 'validada') {
//                 EventCore.emitAsync('internacion:informe:validate', resultado);
//             }
//             if (data.estado?.tipo === 'ejecucion') {
//                 EventCore.emitAsync('internacion:informe:ejecucion', resultado);
//             }

//             return res.json(resultado);
//         } catch (error) {
//             // Manejo de errores
//             console.error('Error en updateInformeEspecial:', error);
//             // Tienes que lanzar o devolver un error que Express pueda manejar (como en el ejemplo de Paciente)
//             // Por simplicidad aquí lo lanzamos, asumiendo que el middleware de Express lo capturará.
//             throw error;
//         }
//     };
//     //     // 👇 MANTENER LA FIRMA ORIGINAL DE update()
//     //     async update(id: any, data: any, req: Request): Promise<any> {
//     //         try {
//     //             // --- 1. Logs de Entrada y Body ---
//     //             console.log('--- INICIO UPDATE ---');
//     //             console.log(`[LOG 1] ID recibido: ${id}`);
//     //             console.log('[LOG 2] Body (data) recibido:', data); // ¡Verifica si esto está vacío!

//     //             // Intentar leer el informe
//     //             const informe: any = await this.Model.findById(id);

//     //             if (!informe) {
//     //                 console.error('[ERROR] Informe no encontrado para el ID:', id);
//     //                 throw new Error('Informe no encontrado');
//     //             }

//     //             // --- 2. Logs de Desestructuración ---
//     //             const { op, estado, informeEgreso, periodosCensables } = data;

//     //             console.log('[LOG 3] Operación (op):', op); // Debe ser 'estadoPush'
//     //             console.log('[LOG 4] Objeto estado desestructurado:', estado); // ¡Debe ser { tipo: 'validada' }!
//     //             console.log('[LOG 5] Estado actual del informe:', informe.estados); // Debe ser 'ejecucion'

//     //             switch (op) {
//     //                 case 'estadoPush':

//     //                     // --- 3. Validación de Propiedades Anidadas (Punto de Falla) ---
//     //                     if (!estado) {
//     //                         console.error('[ERROR DTO] Objeto estado es UNDEFINED en estadoPush.');
//     //                         throw new Error('Faltan datos de estado en el DTO.');
//     //                     }

//     //                     // Validaciones
//     //                     if (informe.estados[informe.estados.length - 1]?.tipo === 'anulada') {
//     //                         console.error('[ERROR VALIDACIÓN] Intento de modificar informe anulado.');
//     //                         throw new Error('Informe anulado, no se puede modificar su estado.');
//     //                     }

//     //                     // Esto debería pasar si el DTO es correcto y 'estado' no es undefined
//     //                     if (informe.estados[informe.estados.length - 1]?.tipo === 'validada' && estado.tipo === 'validada') {
//     //                         console.error('[ERROR VALIDACIÓN] Intento de re-validar informe ya validado.');
//     //                         throw new Error('Informe validado, no se puede volver a validar.');
//     //                     }

//     //                     // Manejo de anulación
//     //                     if (estado.tipo === 'anulada') {
//     //                         EventCore.emitAsync('internacion:informe:anular', informe);
//     //                     }

//     //                     // Agregar nuevo estado
//     //                     if (estado) {
//     //                         informe.estados.push({
//     //                             tipo: estado.tipo,
//     //                             fecha: estado.fecha || new Date()
//     //                         });
//     //                         informe.estadoActual = {
//     //                             tipo: estado.tipo,
//     //                             fecha: estado.fecha || new Date()
//     //                         };
//     //                         console.log(`[LOG 6] Estado cambiado a: ${estado.tipo}`);
//     //                     }

//     //                     // Actualizar informeEgreso si se proporciona
//     //                     if (informeEgreso) {
//     //                         informe.informeEgreso = informeEgreso;
//     //                     }

//     //                     // Actualizar periodosCensables si se proporciona
//     //                     if (periodosCensables) {
//     //                         informe.periodosCensables = periodosCensables;
//     //                     }

//     //                     break;

//     //                 case 'informeEgreso':
//     //                     // ... (lógica de informeEgreso)
//     //                     break;

//     //                 case 'romperValidacion':
//     //                     // ... (lógica de romperValidacion)
//     //                     break;

//     //                 default:
//     //                     // Si no hay 'op' o no coincide, hacer update normal
//     //                     console.log('[LOG 7] Operación por defecto (Object.assign)');
//     //                     Object.assign(informe, data);
//     //             }

//     //             // Auditoría y guardado
//     //             // 🚨 SI EL ERROR ES AQUI, LA PETICIÓN FALLÓ ANTES DE LLEGAR AL update()
//     //             Auth.audit(informe, req);
//     //             console.log('[LOG 8] Auditoría completada.');

//     //             const resultado = await informe.save();
//     //             console.log('[LOG 9] Informe guardado. Enviando respuesta.');

//     //             // Emitir eventos
//     //             if (data.estado?.tipo === 'validada') {
//     //                 EventCore.emitAsync('internacion:informe:validate', resultado);
//     //             }

//     //             if (data.estado?.tipo === 'ejecucion') {
//     //                 EventCore.emitAsync('internacion:informe:ejecucion', resultado);
//     //             }

//     //             console.log('--- FIN UPDATE ---');
//     //             return resultado;
//     //         } catch (error) {
//     //             // --- 4. Logs de Error ---
//     //             console.error('--- ERROR EN UPDATE CATCH ---');
//     //             console.error('[CATCH] Error capturado:', error);
//     //             console.error('--- FIN ERROR EN UPDATE CATCH ---');
//     //             throw error;
//     //         }
//     //     }
//     // }
// }

// export const InformeEstadisticaCtr = new InformeEstadisticaResource({});
// export const InformeEstadisticaRouter = InformeEstadisticaCtr.makeRoutes();
// InformeEstadisticaRouter.patch(
//     '/informe-estadistica/:id/operacion', // Nueva URL más descriptiva
//     Auth.authorize('internacion:informe:patch'), // o un permiso específico
//     asyncHandler(updateInformeEspecial)
// );

import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { InformeEstadistica } from './informe-estadistica.schema';
import { EventCore } from '@andes/event-bus';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '@andes/api-tool'; // Asegúrate de que esta importación sea correcta

class InformeEstadisticaResource extends ResourceBase {
    Model = InformeEstadistica;
    resourceModule = 'internacion';
    resourceName = 'informe-estadistica';
    keyId = '_id';
    middlewares = [Auth.authenticate()];
    searchFields = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        estadoHistorico: {
            field: 'estados.tipo',
            fn: MongoQuery.equalMatch
        },
        search: ['nroCarpeta', 'paciente.apellido', 'paciente.nombre']
    };
}

export const InformeEstadisticaCtr = new InformeEstadisticaResource({});
export const InformeEstadisticaRouter = InformeEstadisticaCtr.makeRoutes();


export const updateInformeEspecial = async (req: Request, res: Response) => {
    const id = req.params.id;
    const data = req.body;

    const resource = InformeEstadisticaCtr;

    try {
        const informe: any = await resource.Model.findById(id);

        if (!informe) {
            return res.status(404).send({ message: 'Informe no encontrado' });
        }

        const { op, estado, informeEgreso, periodosCensables } = data;

        switch (op) {
            case 'estadoPush':
                if (!estado) {
                    return res.status(400).send({ message: 'Faltan datos de estado en el DTO.' });
                }

                const ultimoEstado = informe.estados[informe.estados.length - 1]?.tipo;

                if (ultimoEstado === 'anulada') {
                    return res.status(409).send({ message: 'Informe anulado, no se puede modificar su estado.' });
                }
                if (ultimoEstado === 'validada' && estado.tipo === 'validada') {
                    return res.status(409).send({ message: 'Informe validado, no se puede volver a validar.' });
                }

                if (estado.tipo === 'anulada') {
                    EventCore.emitAsync('internacion:informe:anular', informe);
                }

                informe.estados.push({
                    tipo: estado.tipo,
                    fecha: estado.fecha || new Date()
                });
                informe.estadoActual = {
                    tipo: estado.tipo,
                    fecha: estado.fecha || new Date()
                };

                if (informeEgreso) {
                    informe.informeEgreso = informeEgreso;
                }
                if (periodosCensables) {
                    informe.periodosCensables = periodosCensables;
                }

                break;

            case 'informeEgreso':
                informe.informeEgreso = informeEgreso;
                break;

            case 'romperValidacion':
                if (informe.estadoActual.tipo !== 'validada') {
                    return res.status(409).send({ message: 'El informe no está validado para romper la validación.' });
                }
                informe.estados.push({
                    tipo: 'ejecucion',
                    fecha: new Date()
                });
                informe.estadoActual = {
                    tipo: 'ejecucion',
                    fecha: new Date()
                };
                EventCore.emitAsync('internacion:informe:ejecucion', informe);
                break;

            default:
                return res.status(400).send({ message: 'Operación no reconocida. Use la ruta PATCH general para actualizaciones simples.' });
        }


        Auth.audit(informe, req);
        const resultado = await informe.save();

        if (data.estado?.tipo === 'validada') {
            EventCore.emitAsync('internacion:informe:validate', resultado);
        }
        if (data.estado?.tipo === 'ejecucion') {
            EventCore.emitAsync('internacion:informe:ejecucion', resultado);
        }

        return res.json(resultado);
    } catch (error) {
        throw error;
    }
};

InformeEstadisticaRouter.patch(
    `/${InformeEstadisticaCtr.resourceName}/:id/operacion`,
    Auth.authenticate(),
    asyncHandler(updateInformeEspecial)
);
