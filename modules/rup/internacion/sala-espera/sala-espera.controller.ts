import * as moment from 'moment';
import { Types } from 'mongoose';
import { SalaEspera, ISalaEspera, SalaEsperaID, SalaEsperaSnapshot } from './sala-espera.schema';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { SalaEsperaMovimientos, SalaEsperaAccion } from './sala-espera-movimientos.schema';
import { Auth } from '../../../../auth/auth.class';

export type SalaEsperaCreate = Pick<ISalaEspera, 'nombre' | 'organizacion' | 'capacidad' | 'ambito' | 'estado' | 'sectores' | 'unidadOrganizativas'>;

export async function createSalaEspera(dto: SalaEsperaCreate, req: any) {
    const sala = new SalaEspera(dto);
    sala.audit(req);
    await sala.save();

    const snapshot = new SalaEsperaSnapshot({
        idSalaEspera: sala.id,
        fecha: moment().startOf('year'),
        ocupacion: [],
        ...dto,
    });
    snapshot.audit(req);
    await snapshot.save();
    return sala;
}

export async function updateSalaEspera(id: SalaEsperaID, dto: SalaEsperaCreate, req: Request) {
    const sala = await SalaEspera.findById(id);
    if (sala) {
        sala.set(dto);
        sala.audit(req);
        await sala.save();
        return sala;
    } else {
        return null;
    }
}

export interface SalaEsperaIngreso {
    paciente: any;
    ambito: string;
    idInternacion: ObjectId;
    fecha: Date;
}

export async function ingresarPaciente(id: SalaEsperaID, dto: SalaEsperaIngreso, req: Request) {

    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    const movimiento = new SalaEsperaMovimientos({
        accion: SalaEsperaAccion.IN,
        idSalaEspera: id,
        organizacion,
        ambito: dto.ambito,
        paciente: dto.paciente,
        idInternacion: dto.idInternacion,
        fecha: dto.fecha
    });
    movimiento.audit(req);
    await movimiento.save();
    await SalaEsperaSnapshot.updateMany(
        { idSalaEspera: id, fecha: { $gte: dto.fecha } },
        {
            $push: {
                ocupacion: {
                    paciente: dto.paciente,
                    ambito: dto.ambito,
                    idInternacion: dto.idInternacion,
                    desde: dto.fecha,
                    createdBy: movimiento.createdBy,
                    createdAt: movimiento.createdAt
                }
            }
        }
    );
    return movimiento;

}

export async function egresarPaciente(id: SalaEsperaID, dto: SalaEsperaIngreso, req: Request) {
    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const movimiento = new SalaEsperaMovimientos({
        accion: SalaEsperaAccion.OUT,
        idSalaEspera: id,
        organizacion,
        ambito: dto.ambito,
        paciente: dto.paciente,
        idInternacion: dto.idInternacion,
        fecha: dto.fecha
    });
    movimiento.audit(req);
    await movimiento.save();
    await SalaEsperaSnapshot.updateMany(
        { idSalaEspera: id, fecha: { $gte: dto.fecha } },
        { $pull: { 'ocupacion.idInternacion': dto.idInternacion } }
    );

    return movimiento;
}

export interface ListarOptions {
    id?: SalaEsperaID;
    organizacion: ObjectId;
    fecha: Date;
}

export async function listarSalaEspera(opciones: ListarOptions) {
    const { organizacion, fecha, id } = opciones;
    const $match = {
        'organizacion.id': wrapObjectId(organizacion),
        fecha: { $lte: fecha }
    };
    if (id) {
        $match['idSalaEspera'] = wrapObjectId(id);
    }
    const aggr = SalaEsperaSnapshot.aggregate([
        { $match },
        { $group: { _id: '$idSalaEspera', fecha: { $max: '$fecha' } } },
        {
            $lookup: {
                from: 'internacionSalaEsperaSnapshot',
                let: { idSala: '$_id', fechaMax: '$fecha' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$idSalaEspera', '$$idSala'] },
                                    { $eq: ['$fecha', '$$fechaMax'] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 }
                ],
                as: 'realSnapshot'
            }
        },
        { $unwind: '$realSnapshot' },
        { $replaceRoot: { newRoot: '$realSnapshot' } },
        {
            $lookup: {
                from: 'internacionSalaEsperaMovimientos',
                let: { idsala: '$idSalaEspera', fechaMin: '$fecha' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { idSalaEspera: '$$idsala' },
                                    { $gte: ['$fecha', '$$fechaMin'] },
                                    { $lte: ['$fecha', fecha] },
                                ]
                            },

                        }
                    },
                    { $sort: { fecha: 1 } }
                ],
                as: 'movimientos'
            }
        },
        {
            $addFields: {
                snapshot: {
                    $reduce: {
                        input: '$movimientos',
                        initialValue: '$ocupacion',
                        in: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $eq: ['$$this.accion', SalaEsperaAccion.IN] },
                                        then: {
                                            $concatArrays: [
                                                '$$value',
                                                [{
                                                    paciente: '$$this.paciente',
                                                    ambito: '$$this.ambito',
                                                    idInternacion: '$$this.idInternacion',
                                                    desde: '$$this.fecha',
                                                }]

                                            ]
                                        }
                                    },
                                    {
                                        case: { $eq: ['$$this.accion', SalaEsperaAccion.OUT] },
                                        then: {
                                            $filter: {
                                                input: '$$value',
                                                as: 'item',
                                                cond: { $ne: ['$$item.idInternacion', '$$this.idInternacion'] }
                                            }
                                        },
                                    },

                                ],
                                default: '$$value'
                            }
                        }
                    }
                }
            }
        },
        { $unwind: '$snapshot' },
        {
            $project: {
                id: '$idSalaEspera',
                nombre: 1,
                organizacion: 1,
                unidadOrganizativas: 1,
                sectores: 1,
                paciente: '$snapshot.paciente',
                idInternacion: '$snapshot.idInternacion',
                ambito: '$snapshot.ambito',
                fecha: '$snapshot.desde'
            }
        }
    ]);
    return aggr;
}


function wrapObjectId(objectId: ObjectId) {
    return new Types.ObjectId(objectId);
}
