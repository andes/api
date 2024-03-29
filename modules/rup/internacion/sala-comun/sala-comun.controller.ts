import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { Auth } from '../../../../auth/auth.class';
import { UnidadOrganizativa } from '../../../../core/tm/interfaces/IOrganizacion';
import { InternacionExtras } from '../cama-estados.schema';
import { SalaComunAccion, SalaComunMovimientos } from './sala-comun-movimientos.schema';
import { ISalaComun, SalaComunID, SalaComunSnapshot } from './sala-comun.schema';

export type SalaComunCreate = Pick<ISalaComun, 'nombre' | 'organizacion' | 'capacidad' | 'ambito' | 'estado' | 'sectores' | 'unidadOrganizativas'>;

export interface SalaComunIngreso {
    paciente: any;
    ambito: string;
    idInternacion: ObjectId;
    fecha: Date;
    extras?: InternacionExtras;
    unidadOrganizativa: UnidadOrganizativa;
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
        fecha: dto.fecha,
        extras: dto.extras,
        unidadOrganizativas: [dto.unidadOrganizativa]
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

    if (dto.extras?.ingreso) {
        EventCore.emitAsync('mapa-camas:paciente:ingreso', {
            ...movimiento.toObject(),
            sala: true,
            metadata: dto['metadata']
        });
    }

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
        fecha: dto.fecha,
        extras: dto.extras,
        unidadOrganizativas: [dto.unidadOrganizativa]
    });
    movimiento.audit(req);
    await movimiento.save();
    await SalaComunSnapshot.updateMany(
        { idSalaComun: id, fecha: { $gte: dto.fecha } },
        { $pull: { 'ocupacion.idInternacion': dto.idInternacion } }
    );

    if (dto.extras?.egreso) {
        EventCore.emitAsync('mapa-camas:paciente:egreso', {
            ...movimiento.toObject(),
            sala: true
        });
    }

    return movimiento;
}

export interface ListarOptions {
    id?: SalaComunID;
    organizacion?: ObjectId;
    fecha: Date;
    ambito?: string;
}

export type SalaComunOcupacion = Pick<ISalaComun, 'id' | 'nombre' | 'organizacion' | 'ambito' | 'sectores' | 'unidadOrganizativas'> & {
    paciente: any;
    idInternacion: ObjectId;
    fecha: Date;
    extras?: InternacionExtras;
    createdBy: any;
    createdAt: Date;
    updatedBy: any;
    updatedAt: Date;
};


export async function listarSalaComun(opciones: ListarOptions): Promise<SalaComunOcupacion[]> {
    const { organizacion, fecha, id, ambito } = opciones;
    const $match = {
        fecha: { $lte: fecha }
    };
    if (id) {
        $match['idSalaComun'] = wrapObjectId(id);
    }
    if (organizacion) {
        $match['organizacion.id'] = wrapObjectId(organizacion);
    }
    if (ambito) {
        $match['ambito'] = ambito;
    }
    const aggr: any[] = [
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
                                    { $eq: ['$idSalaComun', '$$idsala'] },
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
                                                    unidadOrganizativas: '$$this.unidadOrganizativas',
                                                    desde: '$$this.fecha',
                                                    extras: '$$this.extras',
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
        { $unwind: { path: '$snapshot', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                id: '$idSalaComun',
                nombre: 1,
                organizacion: 1,
                sectores: 1,
                paciente: '$snapshot.paciente',
                idInternacion: '$snapshot.idInternacion',
                unidadOrganizativas: { $ifNull: ['$snapshot.unidadOrganizativas', '$unidadOrganizativas'] },
                ambito: '$snapshot.ambito',
                fecha: { $ifNull: ['$snapshot.desde', '$fecha'] },
                extras: '$snapshot.extras',
                createdAt: '$snapshot.createdAt',
                createdBy: '$snapshot.createdBy',
                updatedAt: '$snapshot.updatedAt',
                updatedBy: '$snapshot.updatedBy'
            }
        }
    ];
    if (ambito === 'guardia') {
        aggr.push({
            $lookup: {
                from: 'internacionPacienteResumen',
                localField: 'idInternacion',
                foreignField: '_id',
                as: 'estado_internacion'
            }
        });
        aggr.push({ $unwind: { path: '$estado_internacion', preserveNullAndEmptyArrays: true } });
        aggr.push({
            $addFields: {
                fechaIngreso: '$estado_internacion.fechaIngreso',
                fechaAtencion: '$estado_internacion.fechaAtencion',
                prioridad: '$estado_internacion.prioridad',
            }
        });
    }

    return SalaComunSnapshot.aggregate(aggr);
}

export interface SalaComunHistorialOptions {
    organizacion: ObjectId;
    ambito?: string;
    sala?: ObjectId;
    internacion?: ObjectId;
    desde: Date;
    hasta: Date;
}

export async function historial({ organizacion, ambito, sala, internacion, desde, hasta }: SalaComunHistorialOptions) {
    const firstMatch = {};
    if (sala) {
        firstMatch['idSalaComun'] = wrapObjectId(sala);
    }

    if (internacion) {
        firstMatch['idInternacion'] = wrapObjectId(internacion);
    }

    if (ambito) {
        firstMatch['ambito'] = ambito;
    }

    const query = {
        'organizacion.id': wrapObjectId(organizacion),
        fecha: {
            $gte: desde,
            $lte: hasta
        },
        ...firstMatch,
    };


    return SalaComunMovimientos.find(query);
}

/**
 * [TODO] Mover a Andes Core
 */
function wrapObjectId(objectId: ObjectId) {
    return new Types.ObjectId(objectId);
}
