import * as moment from 'moment';
import { Types } from 'mongoose';
import { SalaComun, ISalaComun, SalaComunID, SalaComunSnapshot } from './sala-comun.schema';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { SalaComunMovimientos, SalaComunAccion } from './sala-comun-movimientos.schema';
import { Auth } from '../../../../auth/auth.class';
import { ObjectID } from 'bson';

export type SalaComunCreate = Pick<ISalaComun, 'nombre' | 'organizacion' | 'capacidad' | 'ambito' | 'estado' | 'sectores' | 'unidadOrganizativas'>;

export async function createSalaComun(dto: SalaComunCreate, req: any) {
    const sala = new SalaComun(dto);
    sala.audit(req);
    await sala.save();

    const snapshot = new SalaComunSnapshot({
        idSalaComun: sala.id,
        fecha: moment().startOf('year'),
        ocupacion: [],
        ...dto,
    });
    snapshot.audit(req);
    await snapshot.save();
    return sala;
}

export async function updateSalaComun(id: SalaComunID, dto: SalaComunCreate, req: Request) {
    const sala = await SalaComun.findById(id);
    if (sala) {
        sala.set(dto);
        sala.audit(req);
        await sala.save();
        return sala;
    } else {
        return null;
    }
}

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
                fecha: '$snapshot.desde'
            }
        }
    ]);
    return aggr;
}


function wrapObjectId(objectId: ObjectId) {
    return new Types.ObjectId(objectId);
}
