import { getObjectId, getFakeRequest } from '@andes/unit-test';
import { SalaComunCtr } from '../sala-comun/sala-comun.routes';
import { Types } from 'mongoose';
import moment = require('moment');

export async function createSala() {
    const REQMock = getFakeRequest();
    return await SalaComunCtr.create(
        {
            nombre: 'sala',
            organizacion: { id: getObjectId('organizacion'), nombre: 'castro' },
            ambito: 'internacion',
            estado: 'disponible',
            sectores: [],
            unidadOrganizativas: [],
        },
        REQMock
    );
}

export function createPaciente(documento) {
    return { id: new Types.ObjectId(), documento, nombre: documento, apellido: documento, sexo: 'otro' };
}


export function createUnidadOrganizativa(conceptId: string) {
    return {
        fsn: `unidad organizativa ${conceptId} (medio ambiente)`,
        term: `unidad organizativa ${conceptId}`,
        conceptId,
        semanticTag: 'medio ambiente'
    };
}

export function createInternacionPrestacion(organizacion, fechaEgreso = null) {
    return {
        _id: Types.ObjectId('5d3af64ec8d7a7158e12c242'),
        solicitud: {
            tipoPrestacion: {
                fsn: 'admisión hospitalaria (procedimiento)',
                semanticTag: 'procedimiento',
                conceptId: '32485007',
                term: 'internación'
            },
            tipoPrestacionOrigen: {
            },
            organizacion: {
                _id: organizacion._id,
                nombre: organizacion.nombre,
                id: organizacion._id,
            },
            profesional: {
                id: Types.ObjectId('58f74fd4d03019f919ea1a4b'),
                nombre: 'LEANDRO MARIANO JAVIER',
                apellido: 'DERGO',
                documento: '26331447'
            },
            ambitoOrigen: 'internacion',
            fecha: '2019-07-29T22:00:00.000Z',
            turno: null,
            registros: []
        },
        ejecucion: {
            organizacion,
            fecha: '2019-07-29T22:00:00.000Z',
            registros: [
                {
                    privacy: {
                        scope: 'public'
                    },
                    _id: Types.ObjectId('5d4c717820cc5bcbad5987c6'),
                    destacado: false,
                    esSolicitud: false,
                    esDiagnosticoPrincipal: false,
                    relacionadoCon: [],
                    registros: [],
                    nombre: 'documento de solicitud de admisión',
                    concepto: {
                        fsn: 'documento de solicitud de admisión (elemento de registro)',
                        semanticTag: 'elemento de registro',
                        conceptId: '721915006',
                        term: 'documento de solicitud de admisión'
                    },
                    valor: {
                        informeIngreso: {
                            fechaIngreso: moment().subtract(1, 'd').toDate(),
                            horaNacimiento: '2019-08-08T18:55:43.192Z',
                            edadAlIngreso: '86 año/s',
                            origen: 'Emergencia',
                            ocupacionHabitual: 'Jubilado, retirado',
                            situacionLaboral: 'No trabaja y no busca trabajo',
                            nivelInstruccion: 'Primario completo',
                            especialidades: [
                                {
                                    conceptId: '394802001',
                                    fsn: 'medicina general (calificador)',
                                    semanticTag: 'calificador',
                                    term: 'medicina general'
                                }
                            ],
                            obraSocial: {
                                nombre: 'INSTITUTO NACIONAL DE SERVICIOS SOCIALES PARA JUBILADOS Y PENSIONADOS',
                                codigoFinanciador: 500807.0
                            },
                            nroCarpeta: null,
                            motivo: 'neumonia',
                            organizacionOrigen: null,
                            profesional: {
                                _id: Types.ObjectId('58f74fd4d03019f919ea1a4b'),
                                nombre: 'LEANDRO MARIANO JAVIER',
                                apellido: 'DERGO',
                                documento: '26331447',
                                nombreCompleto: 'DERGO, LEANDRO MARIANO JAVIER',
                                id: Types.ObjectId('58f74fd4d03019f919ea1a4b')
                            },
                            PaseAunidadOrganizativa: null
                        }
                    },
                    createdAt: '2019-08-08T19:01:12.952Z',
                    createdBy: {
                        id: Types.ObjectId('5ca4c38333a46481507661da'),
                        nombreCompleto: 'Miriam Lorena Sanchez',
                        nombre: 'Miriam Lorena',
                        apellido: 'Sanchez',
                        username: 29882039.0,
                        documento: 29882039.0,
                        organizacion
                    },
                    updatedAt: '2019-10-29T16:32:18.491Z',
                    updatedBy: {
                        id: Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
                        nombreCompleto: 'KATHERINE DANIELA SALINAS',
                        nombre: 'KATHERINE DANIELA',
                        apellido: 'SALINAS',
                        username: 36489710.0,
                        documento: 36489710.0,
                        organizacion
                    }
                },
                {
                    privacy: {
                        scope: 'public'
                    },
                    _id: Types.ObjectId('5d4c720c2dbb2023a5576c35'),
                    destacado: false,
                    esSolicitud: false,
                    esDiagnosticoPrincipal: true,
                    relacionadoCon: [],
                    registros: [],
                    esPrimeraVez: true,
                    nombre: 'alta del paciente',
                    concepto: {
                        fsn: 'alta del paciente (procedimiento)',
                        semanticTag: 'procedimiento',
                        conceptId: '58000006',
                        term: 'alta del paciente'
                    },
                    valor: {
                        InformeEgreso: {
                            fechaEgreso: fechaEgreso || moment(new Date()).add(4, 'days').toDate(),
                            nacimientos: [
                                {
                                    pesoAlNacer: null,
                                    condicionAlNacer: null,
                                    terminacion: null,
                                    sexo: null
                                }
                            ],
                            procedimientosQuirurgicos: [],
                            causaExterna: {
                                producidaPor: null,
                                lugar: null,
                                comoSeProdujo: null
                            },
                            diasDeEstada: 1.0,
                            tipoEgreso: {
                                id: 'Alta médica',
                                nombre: 'Alta médica'
                            },
                            diagnosticoPrincipal: {
                                _id: Types.ObjectId('59bbf1ed53916746547cbdba'),
                                idCie10: 1187.0,
                                idNew: 3568.0,
                                capitulo: '10',
                                grupo: '02',
                                causa: 'J12',
                                subcausa: '9',
                                codigo: 'J12.9',
                                nombre: '(J12.9) Neumonía viral, no especificada',
                                sinonimo: 'Neumonia viral, no especificada',
                                descripcion: '10.Enfermedades del sistema respiratorio (J00-J99)',
                                c2: true,
                                reporteC2: 'Neumonia',
                                id: Types.ObjectId('59bbf1ed53916746547cbdba')
                            }
                        }
                    },
                    createdAt: '2019-08-08T19:03:40.224Z',
                    createdBy: {
                        id: Types.ObjectId('5ca4c38333a46481507661da'),
                        nombreCompleto: 'Miriam Lorena Sanchez',
                        nombre: 'Miriam Lorena',
                        apellido: 'Sanchez',
                        username: 29882039.0,
                        documento: 29882039.0,
                        organizacion
                    },
                    updatedAt: '2019-10-29T16:32:18.491Z',
                    updatedBy: {
                        id: Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
                        nombreCompleto: 'KATHERINE DANIELA SALINAS',
                        nombre: 'KATHERINE DANIELA',
                        apellido: 'SALINAS',
                        username: 36489710.0,
                        documento: 36489710.0,
                        organizacion
                    }
                }
            ]
        },
        noNominalizada: false,
        paciente: {
            id: Types.ObjectId('5bf7f2b3beee2831326e6c4c'),
            nombre: 'HERMINIA',
            apellido: 'URRA',
            documento: '2305918',
            sexo: 'femenino',
            fechaNacimiento: '1932-08-15T04:00:00.000Z'
        },
        estados: [
            {
                idOrigenModifica: null,
                motivoRechazo: null,
                _id: Types.ObjectId('5d4c717820cc5bcbad5987c7'),
                tipo: 'ejecucion',
                createdAt: '2019-08-08T19:01:12.952Z',
                createdBy: {
                    id: Types.ObjectId('5ca4c38333a46481507661da'),
                    nombreCompleto: 'Miriam Lorena Sanchez',
                    nombre: 'Miriam Lorena',
                    apellido: 'Sanchez',
                    username: 29882039.0,
                    documento: 29882039.0,
                    organizacion
                }
            }
        ],
        createdAt: '2019-08-08T19:01:12.952Z',
        createdBy: {
            id: Types.ObjectId('5ca4c38333a46481507661da'),
            nombreCompleto: 'Miriam Lorena Sanchez',
            nombre: 'Miriam Lorena',
            apellido: 'Sanchez',
            username: 29882039.0,
            documento: 29882039.0,
            organizacion
        },
        updatedAt: '2019-10-29T16:32:18.491Z',
        updatedBy: {
            id: Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
            nombreCompleto: 'KATHERINE DANIELA SALINAS',
            nombre: 'KATHERINE DANIELA',
            apellido: 'SALINAS',
            username: 36489710.0,
            documento: 36489710.0,
            organizacion
        }
    };
}

export function estadoOcupada(fecha: Date, idInternacion = null, unidadOrganizativa = null, extras = null) {
    unidadOrganizativa = unidadOrganizativa || {
        fsn: 'servicio de adicciones (medio ambiente)',
        term: 'servicio de adicciones',
        conceptId: '4561000013106',
        semanticTag: 'medio ambiente',
    };
    return {
        fecha,
        estado: 'ocupada',
        unidadOrganizativa,
        especialidades: [
            {
                fsn: 'medicina general (calificador)',
                term: 'medicina general',
                conceptId: '394802001',
                semanticTag: 'calificador'
            }
        ],
        esCensable: true,
        genero: {
            fsn: 'género femenino (hallazgo)',
            term: 'género femenino',
            conceptId: '703118005',
            semanticTag: 'hallazgo'
        },
        paciente: {
            _id: Types.ObjectId('5d3af64e5086740d0f5bc6b5'),
            documento: '10000000',
            estado: 'validado',
            nombre: 'PEREZ',
            apellido: 'ANDA',
            sexo: 'femenino',
            genero: 'femenino',
            fechaNacimiento: '2000-11-01T03:00:00.000Z',
        },
        idInternacion: idInternacion || getObjectId('internacion'),
        extras,
        observaciones: null,
        esMovimiento: true,
        sugierePase: null
    };
}
