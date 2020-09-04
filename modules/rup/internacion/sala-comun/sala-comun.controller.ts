import * as moment from 'moment';
import { Types } from 'mongoose';
import { SalaComun, ISalaComun, SalaComunID, SalaComunSnapshot } from './sala-comun.schema';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { SalaComunMovimientos, SalaComunAccion } from './sala-comun-movimientos.schema';
import * as mongoose from 'mongoose';
import { Auth } from '../../../../auth/auth.class';

export type SalaComunCreate = Pick<ISalaComun, 'nombre' | 'organizacion' | 'capacidad' | 'ambito' | 'estado' | 'sectores' | 'unidadOrganizativas'>;

export interface SalaComunIngreso {
    paciente: any;
    ambito: string;
    idInternacion: ObjectId;
    fecha: Date;
}

export async function ingresarPaciente(id: SalaComunID, dto: SalaComunIngreso, req: Request) {

    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    const movimiento = new SalaComunMovimientos({
        accion: SalaComunAccion.IN,
        idSalaComun: id,
        organizacion,
        ambito: dto.ambito,
        paciente: dto.paciente,
        idInternacion: dto.idInternacion,
        fecha: dto.fecha
    });
    movimiento.audit(req);
    await movimiento.save();
    await SalaComunSnapshot.updateMany(
        { idSalaComun: id, fecha: { $gte: dto.fecha } },
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

export async function egresarPaciente(id: SalaComunID, dto: SalaComunIngreso, req: Request) {
    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const movimiento = new SalaComunMovimientos({
        accion: SalaComunAccion.OUT,
        idSalaComun: id,
        organizacion,
        ambito: dto.ambito,
        paciente: dto.paciente,
        idInternacion: dto.idInternacion,
        fecha: dto.fecha
    });
    movimiento.audit(req);
    await movimiento.save();
    await SalaComunSnapshot.updateMany(
        { idSalaComun: id, fecha: { $gte: dto.fecha } },
        { $pull: { 'ocupacion.idInternacion': dto.idInternacion } }
    );

    return movimiento;
}

export interface ListarOptions {
    id?: SalaComunID;
    organizacion?: ObjectId;
    fecha: Date;
}

export type SalaComunOcupacion = Pick<ISalaComun, 'id' | 'nombre' | 'organizacion' | 'ambito' | 'sectores' | 'unidadOrganizativas'> & {
    paciente: any;
    idInternacion: ObjectId,
    fecha: Date;
    createdBy: any,
    createdAt: Date,
    updatedBy: any,
    updatedAt: Date
};


export async function listarSalaComun(opciones: ListarOptions): Promise<SalaComunOcupacion[]> {
    const { organizacion, fecha, id } = opciones;
    const $match = {
        fecha: { $lte: fecha }
    };
    if (id) {
        $match['idSalaComun'] = wrapObjectId(id);
    }
    if (organizacion) {
        $match['organizacion.id'] = wrapObjectId(organizacion);
    }
    const aggr = SalaComunSnapshot.aggregate([
        { $match },
        { $group: { _id: '$idSalaComun', fecha: { $max: '$fecha' } } },
        {
            $lookup: {
                from: 'internacionSalaComunSnapshot',
                let: { idSala: '$_id', fechaMax: '$fecha' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$idSalaComun', '$$idSala'] },
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
                from: 'internacionSalaComunMovimientos',
                let: { idsala: '$idSalaComun', fechaMin: '$fecha' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { idSalaComun: '$$idsala' },
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
                                        case: { $eq: ['$$this.accion', SalaComunAccion.IN] },
                                        then: {
                                            $concatArrays: [
                                                '$$value',
                                                [{
                                                    paciente: '$$this.paciente',
                                                    ambito: '$$this.ambito',
                                                    idInternacion: '$$this.idInternacion',
                                                    desde: '$$this.fecha',
                                                    createdAt: '$$this.createdAt',
                                                    createdBy: '$$this.createdBy',
                                                    updatedAt: '$$this.updatedAt',
                                                    updatedBy: '$$this.updatedBy'
                                                }]

                                            ]
                                        }
                                    },
                                    {
                                        case: { $eq: ['$$this.accion', SalaComunAccion.OUT] },
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
                id: '$idSalaComun',
                nombre: 1,
                organizacion: 1,
                unidadOrganizativas: 1,
                sectores: 1,
                paciente: '$snapshot.paciente',
                idInternacion: '$snapshot.idInternacion',
                ambito: '$snapshot.ambito',
                fecha: '$snapshot.desde',
                createdAt: '$snapshot.createdAt',
                createdBy: '$snapshot.createdBy',
                updatedAt: '$snapshot.updatedAt',
                updatedBy: '$snapshot.updatedBy'
            }
        }
    ]);
    return aggr;
}

export async function historial({ organizacion, ambito }, sala: ObjectId, internacion: ObjectId, desde: Date, hasta: Date) {
    const firstMatch = {};
    if (sala) {
        firstMatch['idSalaComun'] = sala;
    }

    if (internacion) {
        firstMatch['idInternacion'] = internacion;
    }

    const aggregate = [
        {
            $match: {
                'organizacion.id': mongoose.Types.ObjectId(organizacion),
                ambito,
                fecha: { $gte: desde, $lte: hasta },
                ...firstMatch,
            }
        },
        {
            $project: { __v: 0 }
        }
    ];

    return await SalaComunMovimientos.aggregate(aggregate);
}

function wrapObjectId(objectId: ObjectId) {
    return new Types.ObjectId(objectId);
}
