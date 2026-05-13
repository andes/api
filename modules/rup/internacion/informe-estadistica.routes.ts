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
