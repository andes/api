import * as Agenda from '../../../../modules/turnos/schemas/agenda';
import { toArray } from '../../../../utils/utils';
import { Pecas } from '../schemas/pecas';

export async function pecasExport(start, end) {
    const pipeline = [
        {
            $match: {
                updatedAt: {
                    $lt: new Date(end),
                    $gte: new Date(start)
                },
                bloques: {
                    $ne: null
                },
                'bloques.turnos': {
                    $ne: null
                }
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'organizacion._id',
                foreignField: '_id',
                as: 'organizacion'
            }
        },
        {
            $unwind: '$organizacion'
        },
        {
            $addFields: {
                'sobreturnos.sobreturno': true,
                prestacion: {
                    $arrayElemAt: ['$tipoPrestaciones', 0]
                }
            }
        },
        {
            $addFields: {
                _sobreturnos: [{
                    turnos: '$sobreturnos'
                }]
            }
        },
        {
            $addFields: {
                _bloques: {
                    $concatArrays: ['$_sobreturnos', '$bloques']
                }
            }
        },
        {
            $unwind: {
                path: '$_bloques',
                includeArrayIndex: 'bloqueIndex'
            }
        },
        {
            $unwind: '$_bloques.turnos'
        },
        {
            $addFields: {
                '_bloques.turnos.paciente.edad': {
                    $let: {
                        vars: {
                            diffDia: {
                                $divide: [{
                                    $subtract: [
                                        '$_bloques.turnos.horaInicio',
                                        {
                                            $cond: {
                                                if: {
                                                    $eq: [{
                                                        $type: '$_bloques.turnos.paciente.fechaNacimiento'
                                                    }, 'string']
                                                },
                                                then: {
                                                    $dateFromString: {
                                                        dateString: '$_bloques.turnos.paciente.fechaNacimiento'
                                                    }
                                                },
                                                else: '$_bloques.turnos.paciente.fechaNacimiento'
                                            }
                                        }
                                    ]
                                }, 86400000 /* 365252460601 */]
                            }
                        },
                        in: {
                            diffDia: '$$diffDia',
                            diffAnios: {
                                $trunc: {
                                    $divide: ['$$diffDia', 365.25]
                                }
                            },
                            diffMeses: {
                                $trunc: {
                                    $divide: ['$$diffDia', 30.4375]
                                }
                            }
                        }
                    }
                },
                codificacion0: {
                    $arrayElemAt: ['$_bloques.turnos.diagnostico.codificaciones', 0]
                },
                isAnyTrue0: { $anyElementTrue: ['$_bloques.turnos.diagnostico.codificaciones'] },
                codificacion1: {
                    $arrayElemAt: ['$_bloques.turnos.diagnostico.codificaciones', 1]
                },
                codificacion2: {
                    $arrayElemAt: ['$_bloques.turnos.diagnostico.codificaciones', 2]
                },
                _HC: {
                    $arrayElemAt: [{
                        $filter: {
                            input: '$_bloques.turnos.paciente.carpetaEfectores',
                            as: 'item',
                            cond: {
                                $eq: ['$$item.organizacion._id', '$organizacion._id']
                            }
                        }
                    }, 0]
                }
            }
        },
        {
            $addFields: {
                edadOBject: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.paciente.edad.diffAnios', null]
                                },
                                then: {
                                    valor: null,
                                    unidad: null,
                                    CodRangoEdad: null,
                                    RangoEdad: null
                                }
                            },
                            {
                                case: {
                                    $ne: ['$_bloques.turnos.paciente.edad.diffAnios', 0]
                                },
                                then: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: {
                                                    $lte: ['$_bloques.turnos.paciente.edad.diffAnios', 4]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 2,
                                                    RangoEdad: '[1 a 4]'
                                                }
                                            },
                                            {
                                                case: {
                                                    $and: [{
                                                        $lte: ['$_bloques.turnos.paciente.edad.diffAnios', 14]
                                                    }, {
                                                        $gte: ['$_bloques.turnos.paciente.edad.diffAnios', 5]
                                                    }]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 3,
                                                    RangoEdad: '[5 a 14]'
                                                }
                                            },
                                            {
                                                case: {
                                                    $and: [{
                                                        $lte: ['$_bloques.turnos.paciente.edad.diffAnios', 19]
                                                    }, {
                                                        $gte: ['$_bloques.turnos.paciente.edad.diffAnios', 15]
                                                    }]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 4,
                                                    RangoEdad: '[15 a 19]'
                                                }
                                            },
                                            {
                                                case: {
                                                    $and: [{
                                                        $lte: ['$_bloques.turnos.paciente.edad.diffAnios', 39]
                                                    }, {
                                                        $gte: ['$_bloques.turnos.paciente.edad.diffAnios', 20]
                                                    }]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 5,
                                                    RangoEdad: '[20 a 39]'
                                                }
                                            },
                                            {
                                                case: {
                                                    $and: [{
                                                        $lte: ['$_bloques.turnos.paciente.edad.diffAnios', 69]
                                                    }, {
                                                        $gte: ['$_bloques.turnos.paciente.edad.diffAnios', 40]
                                                    }]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 6,
                                                    RangoEdad: '[40 a 69]'
                                                }
                                            },
                                            {
                                                case: {
                                                    $and: [{
                                                        $gte: ['$_bloques.turnos.paciente.edad.diffAnios', 70]
                                                    }]
                                                },
                                                then: {
                                                    valor: '$_bloques.turnos.paciente.edad.diffAnios',
                                                    unidad: 'A',
                                                    CodRangoEdad: 7,
                                                    RangoEdad: '[70 y +]'
                                                }
                                            }
                                        ],
                                        default: {}
                                    }
                                }

                            },
                            {
                                case: {
                                    $ne: ['$_bloques.turnos.paciente.edad.diffMeses', 0]
                                },
                                then: {
                                    valor: '$_bloques.turnos.paciente.edad.diffMeses',
                                    unidad: 'M',
                                    CodRangoEdad: '1',
                                    RangoEdad: [1]
                                }
                            },
                            {
                                case: {
                                    $ne: ['$_bloques.turnos.paciente.edad.diffDia', 0]
                                },
                                then: {
                                    valor: '$_bloques.turnos.paciente.edad.diffDia',
                                    unidad: 'D',
                                    CodRangoEdad: '1',
                                    RangoEdad: [1]
                                }
                            }
                        ],
                        default: ''
                    }
                }
            }
        },
        {
            $project: {
                idEfector: '$organizacion._id',
                Efector: '$organizacion.nombre',
                TipoEfector: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$organizacion.tipoEstablecimiento.nombre', 'Centro de Salud']
                                },
                                then: '1'
                            },
                            {
                                case: {
                                    $eq: ['$organizacion.tipoEstablecimiento.nombre', 'Hospital']
                                },
                                then: '2'
                            },
                            {
                                case: {
                                    $eq: ['$organizacion.tipoEstablecimiento.nombre', 'Puesto Sanitario']
                                },
                                then: '3'
                            },
                            {
                                case: {
                                    $eq: ['$organizacion.tipoEstablecimiento.nombre', 'ONG']
                                },
                                then: '6'
                            }
                        ],
                        default: ''
                    }
                },
                DescTipoEfector: '$organizacion.tipoEstablecimiento.nombre',
                IdZona: null,
                Zona: null,
                SubZona: null,
                idEfectorSuperior: null,
                EfectorSuperior: null,
                AreaPrograma: null,

                idAgenda: '$_id',
                FechaAgenda: {
                    $dateToString: {
                        format: '%Y%m%d',
                        date: '$horaInicio'
                    }
                },
                HoraAgenda: {
                    $dateToString: {
                        format: '%H:%M',
                        date: '$horaInicio'
                    }
                },
                estadoAgenda: '$estado',
                numeroBloque: '$bloqueIndex',
                turnosProgramados: '$_bloques.accesoDirectoProgramado',
                turnosProfesional: '$_bloques.reservadoProfesional',
                turnosLlaves: '$_bloques.reservadoGestion',
                turnosDelDia: '$_bloques.accesoDirectoDelDia',
                idTurno: '$_bloques.turnos._id',
                estadoTurno: '$_bloques.turnos.estado',
                tipoTurno: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.tipoTurno', 'profesional']
                                },
                                then: 'autocitado'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.tipoTurno', 'gestion']
                                },
                                then: 'conllave'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.tipoTurno', 'delDia']
                                },
                                then: 'delDia'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.tipoTurno', 'programado']
                                },
                                then: 'programado'
                            },
                        ],
                        default: null
                    }
                },
                sobreturno: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.sobreturno', true]
                                },
                                then: 'SI'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.sobreturno', false]
                                },
                                then: 'NO'
                            },
                        ],
                        default: 'NO'
                    }
                },
                FechaConsulta: {
                    $dateToString: {
                        format: '%Y%m%d',
                        date: '$_bloques.turnos.horaInicio'
                    }
                },
                HoraTurno: {
                    $dateToString: {
                        format: '%H:%M',
                        date: '$_bloques.turnos.horaInicio'
                    }
                },
                Periodo: {
                    $dateToString: {
                        format: '%Y%m',
                        date: '$_bloques.turnos.horaInicio'
                    }
                },
                Tipodeconsulta: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$codificacion0.codificacionAuditoria.codigo', null]
                                },
                                then: null
                            },
                            {
                                case: {
                                    $eq: ['$codificacion0.primeraVez', true]
                                },
                                then: 'Primera vez'
                            },
                            {
                                case: {
                                    $eq: ['$codificacion0.primeraVez', false]
                                },
                                then: 'Ulterior'
                            }
                        ],
                        default: '1'
                    }
                },
                estadoTurnoAuditoria: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.estado', 'disponible']
                                },
                                then: 'Disponible'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.estado', 'suspendido']
                                },
                                then: 'Suspendido'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.estado', 'asignado']
                                },
                                then: {

                                    $switch: {
                                        branches: [
                                            {
                                                case: {

                                                    $and: [{ $eq: ['$isAnyTrue0', true] },
                                                    { $ne: [{ $in: [{ $type: '$codificacion0.codificacionAuditoria' }, ['missing', 'null', 'undefined']] }, true] },
                                                    { $ne: ['$codificacion0.codificacionAuditoria.codigo', null] }]
                                                },
                                                then: 'Auditado'
                                            },
                                            {
                                                case: {
                                                    $eq: ['$_bloques.turnos.asistencia', 'noAsistio']
                                                },
                                                then: 'Auditado'
                                            },
                                            {
                                                case: {
                                                    $eq: ['$_bloques.turnos.asistencia', 'sinDatos']
                                                },
                                                then: 'Auditado'
                                            },

                                            {
                                                case: {
                                                    $and: [{ $eq: ['$isAnyTrue0', true] }, { $ne: ['$codificacion0.codificacionProfesional.snomed', null] }]
                                                },
                                                then: 'Registrado por Profesional'
                                            },
                                            {
                                                case: {
                                                    $ne: [{ $in: [{ $type: '$_bloques.turnos.asistencia' }, ['missing', 'null', 'undefined']] }, true],
                                                },
                                                then: 'Asistencia Verificada'
                                            }

                                        ],
                                        default: 'Sin registro de asistencia'
                                    }


                                }
                            }
                        ],
                        default: '1'
                    }
                },
                Principal: {
                    $cond: {
                        if: {
                            $ne: ['$codificacion0.codificacionAuditoria.codigo', null]
                        },
                        then: '1',
                        else: '0'
                    }
                },
                ConsC2: {
                    $cond: {
                        if: {
                            $and: [
                                {
                                    $ne: ['$codificacion0.codificacionAuditoria.codigo', null]
                                },
                                {
                                    $eq: ['$codificacion0.codificacionAuditoria.c2', true]
                                },
                                {
                                    $eq: ['$codificacion0.primeraVez', true]
                                }
                            ]
                        },
                        then: 'SI',
                        else: {
                            $cond: {
                                if: {
                                    $eq: ['$codificacion0.codificacionAuditoria.codigo', null]
                                },
                                then: null,
                                else: 'NO'
                            }
                        }
                    }
                },
                ConsObst: {
                    $cond: {
                        if: {
                            $gte: [{
                                $indexOfCP: ['$prestacion.term', 'obstetricia']
                            }, 0]
                        },
                        then: 'SI',
                        else: 'NO'
                    }
                },
                tipoPrestacion: '$prestacion.term',
                DNI: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.documento'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.documento',
                        else: null
                    }
                },
                Apellido: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.apellido'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.apellido',
                        else: null
                    }
                },
                Nombres: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.nombre',
                        else: null
                    }
                },
                HC: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_HC.nroCarpeta'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_HC.nroCarpeta',
                        else: null
                    }
                },
                CodSexo: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.paciente.sexo', null]
                                },
                                then: null
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.paciente.sexo', 'femenino']
                                },
                                then: '2'
                            },
                            {
                                case: {
                                    $eq: ['$_bloques.turnos.paciente.sexo', 'masculino']
                                },
                                then: '1'
                            }
                        ],
                        default: '1'
                    }
                },
                Sexo: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.sexo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.sexo',
                        else: null
                    }
                },
                FechaNacimiento: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.fechaNacimiento'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },
                        then: {
                            $dateToString: {
                                format: '%Y%m%d',
                                date: '$_bloques.turnos.paciente.fechaNacimiento'
                            }
                        },
                        else: null
                    }
                },
                Edad: '$edadOBject.valor',
                UniEdad: '$edadOBject.unidad',
                CodRangoEdad: '$edadOBject.CodRangoEdad',
                RangoEdad: '$edadOBject.RangoEdad',
                IdObraSocial: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.obraSocial.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.obraSocial.codigo',
                        else: null
                    }
                },
                ObraSocial: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.obraSocial.financiador'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.obraSocial.financiador',
                        else: null
                    }
                },
                IdPaciente: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente._id'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente._id',
                        else: null
                    }
                },
                telefono: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.paciente.telefono'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.paciente.telefono',
                        else: null
                    }
                },
                IdBarrio: null,
                Barrio: null,
                IdLocalidad: null,
                Localidad: null,
                IdDpto: null,
                Departamento: null,
                IdPcia: null,
                Provincia: null,
                IdNacionalidad: null,
                Nacionalidad: null,
                Calle: null,
                Altura: null,
                Piso: null,
                Depto: null,
                Manzana: null,
                Longitud: null,
                Latitud: null,
                Peso: null,
                Talla: null,
                TAS: null,
                TAD: null,
                IMC: null,
                RCVG: null,
                asistencia: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$_bloques.turnos.asistencia'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$_bloques.turnos.asistencia',
                        else: null
                    }
                },
                reasignado: {
                    $cond: {
                        if: {
                            $not: ['$_bloques.turnos.reasignado.siguiente']
                        },
                        then: 'NO',
                        else: 'SI'
                    }
                },
                Diag1CodigoOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionProfesional.cie10.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionProfesional.cie10.codigo',
                        else: null
                    }
                },
                Desc1DiagOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionProfesional.cie10.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionProfesional.cie10.nombre',
                        else: null
                    }
                },
                Diag1CodigoAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionAuditoria.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionAuditoria.codigo',
                        else: null
                    }
                },
                Desc1DiagAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionAuditoria.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionAuditoria.nombre',
                        else: null
                    }
                },
                SemanticTag1: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionProfesional.snomed.semanticTag'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionProfesional.snomed.semanticTag',
                        else: null
                    }
                },
                SnomedConcept1: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionProfesional.snomed.conceptId'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionProfesional.snomed.conceptId',
                        else: null
                    }
                },
                SnomedTerm1: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion0.codificacionProfesional.snomed.term'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion0.codificacionProfesional.snomed.term',
                        else: null
                    }
                },
                primeraVez1: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$codificacion0.primeraVez', null]
                                },
                                then: null
                            },
                            {
                                case: {
                                    $eq: ['$codificacion0.primeraVez', true]
                                },
                                then: '1'
                            },
                            {
                                case: {
                                    $eq: ['$codificacion0.primeraVez', false]
                                },
                                then: '0'
                            }
                        ],
                        default: '1'
                    }
                },
                Diag2CodigoOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionProfesional.cie10.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionProfesional.cie10.codigo',
                        else: null
                    }
                },
                Desc2DiagOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionProfesional.cie10.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionProfesional.cie10.nombre',
                        else: null
                    }
                },
                Diag2CodigoAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionAuditoria.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionAuditoria.codigo',
                        else: null
                    }
                },
                Desc2DiagAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionAuditoria.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionAuditoria.nombre',
                        else: null
                    }
                },
                SemanticTag2: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionProfesional.snomed.semanticTag'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionProfesional.snomed.semanticTag',
                        else: null
                    }
                },
                SnomedConcept2: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionProfesional.snomed.conceptId'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionProfesional.snomed.conceptId',
                        else: null
                    }
                },
                SnomedTerm2: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion1.codificacionProfesional.snomed.term'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion1.codificacionProfesional.snomed.term',
                        else: null
                    }
                },
                primeraVez2: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$codificacion1.primeraVez', null]
                                },
                                then: null
                            },
                            {
                                case: {
                                    $eq: ['$codificacion1.primeraVez', true]
                                },
                                then: '1'
                            },
                            {
                                case: {
                                    $eq: ['$codificacion1.primeraVez', false]
                                },
                                then: '0'
                            }
                        ],
                        default: '1'
                    }
                },
                Diag3CodigoOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionProfesional.cie10.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionProfesional.cie10.codigo',
                        else: null
                    }
                },
                Desc3DiagOriginal: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionProfesional.cie10.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionProfesional.cie10.nombre',
                        else: null
                    }
                },
                Diag3CodigoAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionAuditoria.codigo'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionAuditoria.codigo',
                        else: null
                    }
                },
                Desc3DiagAuditado: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionAuditoria.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionAuditoria.nombre',
                        else: null
                    }
                },
                SemanticTag3: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionProfesional.snomed.semanticTag'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionProfesional.snomed.semanticTag',
                        else: null
                    }
                },
                SnomedConcept3: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionProfesional.snomed.conceptId'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionProfesional.snomed.conceptId',
                        else: null
                    }
                },
                SnomedTerm3: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$codificacion2.codificacionProfesional.snomed.term'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$codificacion2.codificacionProfesional.snomed.term',
                        else: null
                    }
                },
                primeraVez3: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $eq: ['$codificacion2.primeraVez', null]
                                },
                                then: null
                            },
                            {
                                case: {
                                    $eq: ['$codificacion2.primeraVez', true]
                                },
                                then: '1'
                            },
                            {
                                case: {
                                    $eq: ['$codificacion2.primeraVez', false]
                                },
                                then: '0'
                            }
                        ],
                        default: '1'
                    }
                },

                Profesional: {
                    $reduce: {
                        input: '$profesionales',
                        initialValue: '',
                        in: {
                            $concat: ['$$value', {
                                $concat: ['$$this.apellido', ' ', '$$this.nombre']
                            }, '; ']
                        }
                    }
                },
                TipoProfesional: null,
                CodigoEspecialidad: null,
                Especialidad: null,
                CodigoServicio: null,
                Servicio: {
                    $cond: {
                        if: {
                            $ne: [{
                                $in: [{
                                    $type: '$espacioFisico.servicio.nombre'
                                },
                                ['missing', 'null', 'undefined']
                                ]
                            }, true]
                        },

                        then: '$espacioFisico.servicio.nombre',
                        else: null
                    }
                },
                codifica: {
                    $cond: {
                        if: {
                            $eq: ['$codificacion0.codificacionProfesional', null]
                        },
                        then: 'NO PROFESIONAL',
                        else: 'PROFESIONAL'
                    }
                },
                turnosMobile: {
                    $cond: {
                        if: {
                            $eq: ['$_bloques.turnos.emitidoPor', 'appMobile']
                        },
                        then: '1',
                        else: '0'
                    }
                },
                updated: {
                    $dateToString: {
                        format: '%Y%m%d %H:%M',
                        date: new Date()
                    }
                }
            }
        }
    ];

    const aggr = Agenda.aggregate(pipeline);
    const data = await toArray(aggr.cursor({}).exec());
    if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            let doc = data[i];
            delete doc._id;
            let pecas = new Pecas(doc);
            await pecas.save();
        }
    }
    return;
}

