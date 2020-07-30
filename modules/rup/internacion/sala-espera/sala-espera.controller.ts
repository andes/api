import { SalaEspera, ISalaEspera, SalaEsperaID } from './sala-espera.schema';
import { Types } from 'mongoose';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { AuditDocument } from '@andes/mongoose-plugin-audit';
import { SalaEsperaMovimientos } from './sala-espera-movimientos.schema';
import { Auth } from '../../../../auth/auth.class';

export type SalaEsperaCreate = Pick<ISalaEspera, 'nombre' | 'organizacion' | 'capacidad' | 'ambito' | 'estado' | 'sectores' | 'unidadOrganizativas'>;

export function createSalaEspera(dto: SalaEsperaCreate, req: any) {
    const sala = new SalaEspera(dto);
    sala.audit(req);
    return sala.save();
}

export interface SalaEsperaIngreso {
    paciente: any;
    ambito: string;
    idInternacion: ObjectId;
    fecha: Date;
}

export function ingresarPaciente(id: SalaEsperaID, dto: SalaEsperaIngreso, req: Request) {

    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    // [TODO] Ver si el paciente estaba ya en esa fecha (?)
    AuditDocument(dto, req.user);

    const p1 = SalaEspera.update(
        { _id: wrapObjectId(id) },
        {
            $push: {
                ocupacion: {
                    paciente: dto.paciente,
                    ambito: dto.ambito,
                    idInternacion: dto.idInternacion,
                    desde: dto.fecha,
                    createdAt: (dto as any).createdAt,
                    createdBy: (dto as any).createdBy,
                    updatedAt: (dto as any).updatedAt,
                    updatedBy: (dto as any).updatedBy,
                }
            }
        }
    );

    const movimiento = new SalaEsperaMovimientos({
        idSalaEspera: id,
        organizacion,
        ambito: dto.ambito,
        paciente: dto.paciente,
        tipo: 'entra',
        idInternacion: dto.idInternacion,
        fecha: dto.fecha
    });
    movimiento.audit(req);
    const p2 = movimiento.save();

    return Promise.all([p1, movimiento]);

}

export async function egresarPaciente(id: SalaEsperaID, dto: SalaEsperaIngreso, req: Request) {

    const organizacion = {
        id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const result = await SalaEspera.update(
        { _id: wrapObjectId(id) },
        {
            $pull: { ocupacion: { idInternacion: dto.idInternacion } } // Por id de paciente es suficiente (?)
        }
    );
    const done = result.nModified > 0 && result.ok === 1;
    if (done) {
        const movimiento = new SalaEsperaMovimientos({
            idSalaEspera: id,
            ambito: dto.ambito,
            paciente: dto.paciente,
            tipo: 'sale',
            idInternacion: dto.idInternacion,
            organizacion,
            fecha: dto.fecha
        });
        movimiento.audit(req);
        return movimiento.save();
    } else {
        throw new Error('paciente no se encontraba en la sala');
    }

}

export interface ListarOptions {
    id?: SalaEsperaID;
    organizacion: ObjectId;
    fecha: Date;
}
export async function listarSalaEspera(opciones) {
    const { organizacion, fecha } = opciones;
    const aggr = SalaEspera.aggregate([
        { $match: { 'organizacion.id': wrapObjectId(organizacion) } },
        {
            $lookup: {
                from: 'internacionSalaEsperaMovimientos',
                let: { idsala: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { idSalaEspera: '$$idsala' },
                            fecha: { $gte: fecha }
                        }
                    },
                    { $sort: { fecha: -1 } }
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
                            $cond: [
                                { $eq: ['$$this.tipo', 'entra'] },
                                // ENTRA ALGIEN, ASI QUE PARA ATRAS LO TENGO QUE SACAR
                                {
                                    $filter: {
                                        input: '$$value',
                                        as: 'item',
                                        cond: { $ne: ['$$item.paciente.id', '$$this.paciente.id'] }
                                    }
                                },
                                {
                                    $concatArrays: [
                                        '$$value',
                                        [{
                                            paciente: '$$this.paciente',
                                            ambito: '$$this.ambito',
                                            idInternacion: '$$this.idInternacion',
                                        }]

                                    ]
                                }
                            ]

                        }
                    }
                }
            }
        },
        { $unwind: '$snapshot' },
        {
            $project: {
                id: '$_id',
                nombre: 1,
                organizacion: 1,
                unidadOrganizativas: 1,
                sectores: 1,
                paciente: '$snapshot.paciente',
                idInternacion: '$snapshot.idInternacion',
                ambito: '$snapshot.ambito',
            }

        }
    ]);
    return aggr;
}


function wrapObjectId(objectId: ObjectId) {
    return new Types.ObjectId(objectId);
}
