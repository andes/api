const mongoose = require('mongoose');

import * as moment from 'moment';
import { MongoMemoryServer } from 'mongodb-memory-server-global';
import { model as Prestaciones } from '../schemas/prestacion';
import { store, findById, search, patch, changeTime, listaEspera } from './camas.controller';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';
import * as CamasEstadosController from './cama-estados.controller';
import { EstadosCtr } from './estados.routes';
import { Auth } from '../../../auth/auth.class';
import { patch as patchEstados } from './cama-estados.controller';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer: any;
let cama: any;

beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    mongoose.connect(mongoUri);
});


afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});


const REQMock: any = {
    user: {
        usuario: { nombre: 'JUAN' }
    }
};

function seedCama() {
    return {
        organizacion: {
            _id: '57f67a7ad86d9f64130a138d',
            nombre: 'HOSPITAL NEUQUEN'
        },
        ambito: 'internacion',
        unidadOrganizativa: {
            fsn: 'servicio de adicciones (medio ambiente)',
            term: 'servicio de adicciones',
            conceptId: '4561000013106',
            semanticTag: 'medio ambiente'
        },
        sectores: [],
        nombre: 'CAMA ABAJO',
        tipoCama: {
            fsn: 'cama (objeto físico)',
            term: 'cama',
            conceptId: '229772003',
            semanticTag: 'objeto físico'
        },
        equipamiento: [],
        esCensable: true,
        esMovimiento: true
    };
}

describe('Internacion - camas', () => {

    beforeEach(async () => {
        await Camas.remove({});
        await CamaEstados.remove({});
        await Prestaciones.remove({});
        cama = await store(seedCama() as any, REQMock);
    });


    test('create cama', async () => {
        const camaDB: any = await Camas.findById(cama._id);
        const test = INTERNACION_CAPAS.map(async (capa) => {
            const camaEstadoDB: any = await CamaEstados.find({
                idOrganizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
                ambito: 'internacion',
                capa,
                idCama: cama._id,
                start: moment().startOf('month').toDate(),
                end: moment().endOf('month').toDate(),
            });

            expect(camaDB.nombre).toBe(cama.nombre);
            expect(camaEstadoDB.length).toBe(1);
            expect(camaEstadoDB[0].estados[0].estado).toBe('disponible');
        });
        return await Promise.all(test);
    });

    test('cama - findById', async () => {
        const camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada._id.toString()).toBe(cama._id.toString());
        expect(camaEncontrada.nombre).toBe(cama.nombre);

        const camas = await search({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, {});

        expect(camas.length).toBe(1);
        expect(camas[0].createdAt).toBeDefined();

        const camasFiltradas = await search({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, { cama: cama._id });

        expect(camasFiltradas.length).toBe(1);

    });

    test('cama - patch de estados', async () => {
        const maquinaEstados = await EstadosCtr.create({
            organizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            ambito: 'internacion',
            capa: 'medica',
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

        expect(maquinaEstados.createdAt).toBeDefined();
        expect(maquinaEstados.createdBy.nombre).toBe(REQMock.user.usuario.nombre);

        await EstadosCtr.create({
            organizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            ambito: 'internacion',
            capa: 'enfermeria',
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


        const estados = await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'inactiva',
            fecha: moment().add(1, 'h').toDate(),
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        }, REQMock);

        const camaDB: any = await Camas.findById(cama._id);
        expect(camaDB.tipoCama.conceptId).toBe('1234567890');

        let camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'h').toDate());


        expect(camaEncontrada.estado).toBe('inactiva');

        camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'enfermeria', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada.estado).toBe('disponible');


        const resultNull = await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'disponible',
            fecha: moment().add(2, 'h').toDate(),
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        }, REQMock);
        expect(resultNull).toBeNull();

        camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'h').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');


        await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'enfermeria',
            estado: 'ocupada',
            fecha: moment().add(2, 'month').toDate(),
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297',
                sexo: ''
            }
        }, REQMock);

        camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'month').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');

        camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'enfermeria', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada.estado).toBe('disponible');

        camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'enfermeria', ambito: 'internacion' }, cama._id, moment().add(3, 'month').toDate());
        expect(camaEncontrada.estado).toBe('ocupada');

        const _estados = await CamaEstados.find({
            idOrganizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            idCama: cama._id,
            ambito: 'internacion',
            capa: 'enfermeria'
        });
        expect(_estados.length).toBe(2);
    });

    test('Cama - Lista Espera con Cama Disponible', async () => {
        const nuevaPrestacion: any = new Prestaciones(prestacion());
        Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
        await nuevaPrestacion.save();

        const listaEsp = await listaEspera({ fecha: moment().toDate(), organizacion: { _id: '57f67a7ad86d9f64130a138d' }, ambito: 'internacion', capa: 'estadistica' });
        expect(listaEsp.length).toBe(1);
        expect(listaEsp[0]._id.toString()).toBe('5d3af64ec8d7a7158e12c242');

    });

    test('Cama - Lista Espera con Cama Ocupada', async () => {
        const nuevoOcupado = estadoOcupada();
        await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

        const nuevaPrestacion: any = new Prestaciones(prestacion());
        Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
        await nuevaPrestacion.save();

        const listaEsp = await listaEspera({ fecha: moment().toDate(), organizacion: { _id: '57f67a7ad86d9f64130a138d' }, ambito: 'internacion', capa: 'estadistica' });
        expect(listaEsp.length).toBe(1);
        expect(listaEsp[0]._id.toString()).toBe('5d3af64ec8d7a7158e12c242');

    });

    test('update fecha de un estado', async () => {
        const maquinaEstados = await EstadosCtr.create({
            organizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            ambito: 'internacion',
            capa: 'medica',
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

        const from = moment().add(1, 'h').toDate();
        const to = moment().add(2, 'h').toDate();

        const estados = await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'inactiva',
            fecha: from,
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        }, REQMock);

        const valid = await patchEstados({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion', cama: cama._id }, from, to);

        const camaEncontrada = await findById({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'h').toDate());
        expect(camaEncontrada.fecha.toISOString()).toBe(to.toISOString());

    });

    test('update fecha de un estado fallida', async () => {
        const fechaIngreso = moment().add(2, 'hour').toDate();
        await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'ocupada',
            fecha: fechaIngreso,
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            idInternacion: '57f67a7ad86d9f64130a138d'
        }, REQMock);

        const fechaPase = moment().add(3, 'hour').toDate();
        await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'ocupada',
            fecha: fechaPase,
            organizacion: {
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            unidadOrganizativa: {
                fsn: 'servicio de adicciones (medio ambiente)',
                term: 'servicio de adicciones',
                conceptId: '4561000013103',
                semanticTag: 'medio ambiente'
            }
        }, REQMock);


        const fechaNuevaIngreso = moment().add(4, 'hour').toDate();
        const mustBeNull = await changeTime({ organizacion: { _id: '57f67a7ad86d9f64130a138d' }, capa: 'medica', ambito: 'internacion' }, cama._id, fechaIngreso, fechaNuevaIngreso, '57f67a7ad86d9f64130a138d', REQMock);
        expect(mustBeNull).toBe(false);

    });

});

function estadoOcupada() {
    return {
        fecha: moment().toDate(),
        estado: 'ocupada',
        unidadOrganizativa: {
            fsn: 'servicio de adicciones (medio ambiente)',
            term: 'servicio de adicciones',
            conceptId: '4561000013106',
            semanticTag: 'medio ambiente',
            _id: mongoose.Types.ObjectId('5c8a88e2af621b10273ba23d'),
            id: mongoose.Types.ObjectId('5c8a88e2af621b10273ba23d')
        },
        especialidades: [
            {
                _id: mongoose.Types.ObjectId('5c95036cc5861a722ddd563d'),
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
            claveBlocking: [
                'ANSRALN',
                'ANSRN',
                'ALNNTN',
                '6496566365',
                '6496'
            ],
            entidadesValidadoras: [
                'Sisa',
                'RENAPER'
            ],
            _id: mongoose.Types.ObjectId('5d3af64e5086740d0f5bc6b5'),
            identificadores: [
                {
                    entidad: 'SIPS',
                    valor: '733776'
                }
            ],
            contacto: [
                {
                    activo: true,
                    _id: mongoose.Types.ObjectId('5cf4f5facdb7f026ed635a77'),
                    tipo: 'celular',
                    valor: '2995166965',
                    ranking: 0,
                    ultimaActualizacion: '2019-06-03T10:26:09.207Z'
                }
            ],
            direccion: [],
            relaciones: [],
            financiador: [],
            carpetaEfectores: [],
            notas: [],
            documento: '40616354',
            estado: 'validado',
            nombre: 'AILEN ANTONELA',
            apellido: 'ANZORENA',
            sexo: 'femenino',
            genero: 'femenino',
            fechaNacimiento: '1997-11-01T03:00:00.000Z',
            estadoCivil: null,
            activo: true,
            createdAt: '2019-04-09T10:15:12.355Z',
            createdBy: {
                id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
                nombreCompleto: 'Miriam Lorena Sanchez',
                nombre: 'Miriam Lorena',
                apellido: 'Sanchez',
                username: 29882039,
                documento: 29882039,
                organizacion: {
                    _id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
                    nombre: 'HOSPITAL NEUQUEN',
                    id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d')
                }
            },
            scan: '00249041503@ANZORENA@AILN ANTONELA@F@40616354@A@01/11/1997@25/02/2014',
            updatedAt: '2019-07-26T12:47:10.703Z',
            updatedBy: {
                id: mongoose.Types.ObjectId('5b5a00ae43563f10834c067c'),
                nombreCompleto: 'MARIA RAQUEL MU�OZ',
                nombre: 'MARIA RAQUEL',
                apellido: 'MU�OZ',
                username: 27932209,
                documento: 27932209,
                organizacion: {
                    _id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
                    nombre: 'HOSPITAL NEUQUEN',
                    id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d')
                }
            },
            cuil: '27406163542',
            reportarError: false
        },
        idInternacion: mongoose.Types.ObjectId('5d3af64ec7d7a7158e23c356'),
        observaciones: null,
        esMovimiento: true,
        sugierePase: null
    };
}

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
            organizacion: {
                id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
                nombre: 'HOSPITAL NEUQUEN'
            },
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
                nombre: 'HOSPITAL NEUQUEN'
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
                            fechaIngreso: moment().subtract(5, 'month').toDate().toISOString(),
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
                            nombre: 'HOSPITAL NEUQUEN',
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
                            nombre: 'HOSPITAL NEUQUEN',
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
                            fechaEgreso: moment(new Date()).add(1, 'days'),
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
                            nombre: 'HOSPITAL NEUQUEN',
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
                            nombre: 'HOSPITAL NEUQUEN',
                            id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
                        }
                    }
                }
            ]
        },
        noNominalizada: false,
        paciente: {
            id: mongoose.Types.ObjectId('5bf7f2b3beee2831326e6c4c'),
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
                        nombre: 'HOSPITAL NEUQUEN',
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
                nombre: 'HOSPITAL NEUQUEN',
                id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
            }
        },
        __v: 3.0,
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
                nombre: 'HOSPITAL NEUQUEN',
                id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
            }
        }
    };
}
