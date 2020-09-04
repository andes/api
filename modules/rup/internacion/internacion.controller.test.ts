const mongoose = require('mongoose');

import { store, patch } from './camas.controller';
import { createSala, createPaciente } from './sala-comun/sala-comun-snapshot.test';
import { ingresarPaciente } from './sala-comun/sala-comun.controller';
import { model as Prestaciones } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';
import { SalaComun, SalaComunSnapshot } from './sala-comun/sala-comun.schema';
import { SalaComunMovimientos } from './sala-comun/sala-comun-movimientos.schema';
import * as InternacionController from './internacion.controller';
import { SalaComunCtr } from './sala-comun/sala-comun.routes';

import * as moment from 'moment';
import { MongoMemoryServer } from 'mongodb-memory-server-global';
import { getFakeRequest, setupUpMongo } from '@andes/unit-test';
import { EstadosCtr } from './estados.routes';

const REQMock = getFakeRequest();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

const ambito = 'internacion';
const capa = 'estadistica';
let cama: any;
let internacion: any;
let organizacion: any;
const paciente1 = createPaciente('10000000');

setupUpMongo();

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestaciones.remove({});
    await SalaComun.remove({});
    await SalaComunSnapshot.remove({});
    await SalaComunMovimientos.remove({});
    (REQMock as any).user.organizacion['id'] = '57e9670e52df311059bc8964';
    (REQMock as any).user.organizacion['nombre'] = 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON9670e52df311059bc8964';
    cama = await store(seedCama(1, 'y') as any, REQMock);
    organizacion = cama.organizacion._id;
    internacion = prestacion();
});

function seedCama(cantidad, unidad, unidadOrganizativaCama = null) {
    return {
        esMovimiento: true,
        fecha: moment().subtract(cantidad, unidad).toDate(),
        organizacion: {
            _id: mongoose.Types.ObjectId('57e9670e52df311059bc8964'),
            nombre: 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON'
        },
        ambito: 'internacion',
        unidadOrganizativa: unidadOrganizativaCama || {
            refsetIds: [],
            fsn: 'departamento de rayos X (medio ambiente)',
            term: 'departamento de rayos X',
            conceptId: '225747005',
            semanticTag: 'medio ambiente',
        },
        sectores: [
            {
                tipoSector: {
                    refsetIds: [],
                    semanticTag: 'medio ambiente',
                    conceptId: '2371000013103',
                    term: 'ala',
                    fsn: 'ala (medio ambiente)'
                },
                nombre: 'ALA A'
            },
            {
                tipoSector: {
                    refsetIds: [],
                    semanticTag: 'medio ambiente',
                    conceptId: '2401000013100',
                    term: 'habitación',
                    fsn: 'habitación (medio ambiente)'
                },
                nombre: 'H102'
            }
        ],
        nombre: 'Cama 123',
        tipoCama: {
            fsn: 'cama (objeto físico)',
            term: 'cama',
            conceptId: '229772003',
            semanticTag: 'objeto físico'
        }
    };
}

describe('Internacion - Controller', () => {
    test('Historial de Internación', async () => {
        await EstadosCtr.create({
            organizacion,
            ambito: 'internacion',
            capa: 'estadistica',
            estados: [
                { key: 'disponible' },
                { key: 'ocupada' },
                { key: 'inactiva' }
            ],
            relaciones: [
                { origen: 'disponible', destino: 'inactiva' },
                { origen: 'disponible', destino: 'ocupada' },
                { origen: 'ocupada', destino: 'disponible' },
            ]
        }, REQMock);

        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'ocupada',
            fecha: moment().subtract(2.5, 'd').toDate(),
            esMovimiento: true,
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            idInternacion: internacion._id
        }, REQMock);

        const sala = await SalaComunCtr.create(
            {
                nombre: 'sala',
                organizacion: cama.organizacion,
                ambito: 'internacion',
                estado: 'disponible',
                sectores: [],
                unidadOrganizativas: [],
            },
            REQMock
        );

        await ingresarPaciente(
            sala._id,
            {
                paciente: paciente1,
                ambito: 'internacion',
                idInternacion: internacion._id,
                fecha: moment().subtract(2, 'd').toDate()
            },
            REQMock
        );
        const historialInternacion = await InternacionController.obtenerHistorialInternacion(organizacion, capa, internacion._id, moment().subtract(4, 'month').toDate(), moment().toDate());
        expect(historialInternacion.length).toBe(2);
    });
});

function prestacion() {
    return {
        _id: mongoose.Types.ObjectId('5d3af64ec8d7a7158e12c242'),
        solicitud: {
            tipoPrestacion: {

                fsn: 'admisión hospitalaria (procedimiento)',
                semanticTag: 'procedimiento',
                conceptId: '32485007',
                term: 'internación'
            },
            tipoPrestacionOrigen: {

            },
            organizacion,
            profesional: {
                id: mongoose.Types.ObjectId('58f74fd4d03019f919ea1a4b'),
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
            organizacion: {
                id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
                nombre: 'HOSPITAL AÑELO'
            },
            fecha: '2019-07-29T22:00:00.000Z',
            registros: [
                {
                    privacy: {
                        scope: 'public'
                    },
                    _id: mongoose.Types.ObjectId('5d4c717820cc5bcbad5987c6'),
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
                                _id: mongoose.Types.ObjectId('58f74fd4d03019f919ea1a4b'),
                                nombre: 'LEANDRO MARIANO JAVIER',
                                apellido: 'DERGO',
                                documento: '26331447',
                                nombreCompleto: 'DERGO, LEANDRO MARIANO JAVIER',
                                id: mongoose.Types.ObjectId('58f74fd4d03019f919ea1a4b')
                            },
                            PaseAunidadOrganizativa: null
                        }
                    },
                    createdAt: '2019-08-08T19:01:12.952Z',
                    createdBy: {
                        id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
                        nombreCompleto: 'Miriam Lorena Sanchez',
                        nombre: 'Miriam Lorena',
                        apellido: 'Sanchez',
                        username: 29882039.0,
                        documento: 29882039.0,
                        organizacion: {
                            _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                            nombre: 'HOSPITAL AÑELO',
                            id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                        }
                    },
                    updatedAt: '2019-10-29T16:32:18.491Z',
                    updatedBy: {
                        id: mongoose.Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
                        nombreCompleto: 'KATHERINE DANIELA SALINAS',
                        nombre: 'KATHERINE DANIELA',
                        apellido: 'SALINAS',
                        username: 36489710.0,
                        documento: 36489710.0,
                        organizacion: {
                            _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                            nombre: 'HOSPITAL AÑELO',
                            id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                        }
                    }
                },
                {
                    privacy: {
                        scope: 'public'
                    },
                    _id: mongoose.Types.ObjectId('5d4c720c2dbb2023a5576c35'),
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
                            fechaEgreso: moment(new Date()).add(4, 'days'),
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
                                _id: mongoose.Types.ObjectId('59bbf1ed53916746547cbdba'),
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
                                id: mongoose.Types.ObjectId('59bbf1ed53916746547cbdba')
                            }
                        }
                    },
                    createdAt: '2019-08-08T19:03:40.224Z',
                    createdBy: {
                        id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
                        nombreCompleto: 'Miriam Lorena Sanchez',
                        nombre: 'Miriam Lorena',
                        apellido: 'Sanchez',
                        username: 29882039.0,
                        documento: 29882039.0,
                        organizacion: {
                            _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                            nombre: 'HOSPITAL AÑELO',
                            id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                        }
                    },
                    updatedAt: '2019-10-29T16:32:18.491Z',
                    updatedBy: {
                        id: mongoose.Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
                        nombreCompleto: 'KATHERINE DANIELA SALINAS',
                        nombre: 'KATHERINE DANIELA',
                        apellido: 'SALINAS',
                        username: 36489710.0,
                        documento: 36489710.0,
                        organizacion: {
                            _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                            nombre: 'HOSPITAL AÑELO',
                            id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                        }
                    }
                }
            ]
        },
        noNominalizada: false,
        paciente: paciente1,
        estados: [
            {
                idOrigenModifica: null,
                motivoRechazo: null,
                _id: mongoose.Types.ObjectId('5d4c717820cc5bcbad5987c7'),
                tipo: 'ejecucion',
                createdAt: '2019-08-08T19:01:12.952Z',
                createdBy: {
                    id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
                    nombreCompleto: 'Miriam Lorena Sanchez',
                    nombre: 'Miriam Lorena',
                    apellido: 'Sanchez',
                    username: 29882039.0,
                    documento: 29882039.0,
                    organizacion: {
                        _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                        nombre: 'HOSPITAL AÑELO',
                        id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                    }
                }
            },
            {
                idOrigenModifica: null,
                motivoRechazo: null,
                _id: mongoose.Types.ObjectId('5db869929929a9fe57109744'),
                tipo: 'validada',
                createdAt: '2019-10-29T16:32:18.491Z',
                createdBy: {
                    id: mongoose.Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
                    nombreCompleto: 'KATHERINE DANIELA SALINAS',
                    nombre: 'KATHERINE DANIELA',
                    apellido: 'SALINAS',
                    username: 36489710.0,
                    documento: 36489710.0,
                    organizacion: {
                        _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                        nombre: 'HOSPITAL AÑELO',
                        id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                    }
                }
            }
        ],
        createdAt: '2019-08-08T19:01:12.952Z',
        createdBy: {
            id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
            nombreCompleto: 'Miriam Lorena Sanchez',
            nombre: 'Miriam Lorena',
            apellido: 'Sanchez',
            username: 29882039.0,
            documento: 29882039.0,
            organizacion: {
                _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                nombre: 'HOSPITAL AÑELO',
                id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
            }
        },
        updatedAt: '2019-10-29T16:32:18.491Z',
        updatedBy: {
            id: mongoose.Types.ObjectId('5bcdf3ed3f008b2c464fe3a2'),
            nombreCompleto: 'KATHERINE DANIELA SALINAS',
            nombre: 'KATHERINE DANIELA',
            apellido: 'SALINAS',
            username: 36489710.0,
            documento: 36489710.0,
            organizacion: {
                _id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8'),
                nombre: 'HOSPITAL AÑELO',
                id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
            }
        }
    };
}
