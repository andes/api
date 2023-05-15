const mongoose = require('mongoose');
import { Types } from 'mongoose';
import { getFakeRequest, setupUpMongo } from '@andes/unit-test';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { Prestacion } from '../schemas/prestacion';
import { CamaEstados } from './cama-estados.schema';
import { findById, patchEstados, storeEstados } from './camas.controller';
import { Camas } from './camas.schema';
import { EstadosCtr } from './estados.routes';
import * as InternacionController from './internacion.controller';
import { SalaComunMovimientos } from './sala-comun/sala-comun-movimientos.schema';
import { ingresarPaciente } from './sala-comun/sala-comun.controller';
import { SalaComunCtr } from './sala-comun/sala-comun.routes';
import { SalaComun, SalaComunSnapshot } from './sala-comun/sala-comun.schema';
import { createPaciente, createUnidadOrganizativa } from './test-utils';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

const REQMock = getFakeRequest();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

const ambito = 'internacion';
const capa = 'estadistica';
let cama: any;
let internacion;
let organizacion: any;
const paciente1 = createPaciente('10000000');
let idCama;

setupUpMongo();

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestacion.remove({});
    await SalaComun.remove({});
    await SalaComunSnapshot.remove({});
    await SalaComunMovimientos.remove({});
    await Organizacion.remove({});

    (REQMock as any).user.organizacion['id'] = '57e9670e52df311059bc8964';
    (REQMock as any).user.organizacion['nombre'] = 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON9670e52df311059bc8964';

    const newOrganizacion = new Organizacion({
        _id: Types.ObjectId('57e9670e52df311059bc8964'),
        nombre: 'HTAL PROV NEUQUEN - DR EDUARDO CASTRO RENDON',
        codigo: {
            sisa: '10580352167033',
            cuie: 'Q06391',
            remediar: '00001',
            sips: '205'
        },
        activo: true
    });
    Auth.audit(newOrganizacion, REQMock);
    organizacion = await newOrganizacion.save();

    cama = new Camas(seedCama(1, 'y'));
    cama.audit(REQMock);
    cama = await cama.save();
    const dataEstados = {
        ...seedCama(1, 'y'),
        _id: cama._id
    };
    await storeEstados(dataEstados, REQMock);;
    idCama = String(cama._id);
    internacion = await storeInternacion();
});

async function storeInternacion() {
    const nuevaInternacion = new Prestacion({
        solicitud: {
            tipoPrestacion: {
                fsn: 'admisión hospitalaria (procedimiento)',
                semanticTag: 'procedimiento',
                conceptId: '32485007',
                term: 'internación'
            },
            organizacion: {
                _id: mongoose.Types.ObjectId('57e9670e52df311059bc8964'),
                nombre: 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON'
            },
            profesional: {
                id: mongoose.Types.ObjectId('5cfa6c7d44050298c7173208'),
                nombre: 'LAUTARO ALBERTO',
                apellido: 'MOLINA LAGOS',
                documento: '34377650'
            },
            ambitoOrigen: 'internacion',
            fecha: moment().toDate(),
            turno: null,
            registros: []
        },
        ejecucion: {
            organizacion: {
                id: Types.ObjectId('57e9670e52df311059bc8964'),
                nombre: 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON'
            },
            fecha: moment().toDate(),
            registros: [
                {
                    privacy: {
                        scope: 'public'
                    },
                    destacado: false,
                    esSolicitud: false,
                    esDiagnosticoPrincipal: false,
                    relacionadoCon: [],
                    elementoRUP: null,
                    nombre: 'documento de solicitud de admisión',
                    concepto: {
                        fsn: 'documento de solicitud de admisión (elemento de registro)',
                        semanticTag: 'elemento de registro',
                        conceptId: '721915006',
                        term: 'documento de solicitud de admisión'
                    },
                    valor: {
                        informeIngreso: {
                            fechaIngreso: moment().subtract(2, 'hours').toDate(),
                            horaNacimiento: moment().subtract(2, 'hours').toDate(),
                            edadAlIngreso: '63 año/s',
                            origen: 'Consultorio externo',
                            ocupacionHabitual: null,
                            situacionLaboral: null,
                            especialidades: [
                                {
                                    _id: '5ea9763acac91c5873e24c0b',
                                    conceptId: '419192003',
                                    fsn: 'medicina interna (calificador)',
                                    semanticTag: 'calificador',
                                    term: 'clínica médica'
                                }
                            ],
                            asociado: 'Plan o Seguro público',
                            obraSocial: {
                                nombre: 'SUMAR',
                                financiador: 'SUMAR',
                                codigoPuco: null
                            },
                            nroCarpeta: null,
                            motivo: null,
                            organizacionOrigen: null,
                            profesional: paciente1,
                            PaseAunidadOrganizativa: null
                        }
                    },
                    registros: [],
                    hasSections: false,
                    isSection: false,
                    noIndex: false,
                }
            ]
        },
        estados: [
            {
                tipo: 'ejecucion',
                fecha: moment().toDate(),
            }
        ],
        noNominalizada: false,
        paciente: paciente1,
        inicio: 'internacion'
    });
    Auth.audit(nuevaInternacion, REQMock);
    const resp = await Prestacion.create(nuevaInternacion);
    return resp;
}


function seedCama(cantidad, unidad, unidadOrganizativaCama = null) {
    return {
        esMovimiento: true,
        fecha: moment().subtract(cantidad, unidad).toDate(),
        organizacion: {
            _id: Types.ObjectId('57e9670e52df311059bc8964'),
            nombre: 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON'
        },
        ambito: 'internacion',
        unidadOrganizativaOriginal: unidadOrganizativaCama || {
            refsetIds: [],
            fsn: 'departamento de rayos X (medio ambiente)',
            term: 'departamento de rayos X',
            conceptId: '225747005',
            semanticTag: 'medio ambiente',
        },
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

        await patchEstados({
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
            idInternacion: internacion.id
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
                idInternacion: internacion.id,
                fecha: moment().subtract(2, 'd').toDate(),
                unidadOrganizativa: createUnidadOrganizativa('123456789')
            },
            REQMock
        );
        const historialInternacion = await InternacionController.obtenerHistorialInternacion(organizacion.id, capa, internacion.id, moment().subtract(4, 'month').toDate(), moment().toDate());
        expect(historialInternacion.length).toBe(2);
    });
});

test('Deshacer Internacion', async () => {
    const maquinaEstados = await EstadosCtr.create({
        organizacion,
        ambito,
        capa,
        estados: [
            { key: 'disponible' },
            { key: 'ocupada' },
            { key: 'bloqueada' },
            { key: 'inactiva' }
        ],
        relaciones: [
            { origen: 'disponible', destino: 'inactiva' },
            { origen: 'disponible', destino: 'ocupada' },
            { origen: 'disponible', destino: 'bloqueada' },
            { origen: 'bloqueada', destino: 'disponible' },
            { origen: 'ocupada', destino: 'disponible' },
        ]
    }, REQMock);

    expect(maquinaEstados.createdAt).toBeDefined();
    expect(maquinaEstados.createdBy.nombre).toBe(REQMock.user.usuario.nombre);

    // OCUPA LA CAMA
    await patchEstados({
        id: cama._id,
        ambito,
        capa,
        estado: 'ocupada',
        esMovimiento: true,
        fecha: moment().subtract(2, 'hours').toDate(),
        organizacion: cama.organizacion,
        extras: { ingreso: true },
        idInternacion: internacion.id,
        paciente: {
            id: '57f67a7ad86d9f64130a138d',
            _id: '57f67a7ad86d9f64130a138d',
            nombre: 'JUANCITO',
            apellido: 'PEREZ',
            documento: '38432297',
            sexo: 'otro'
        }
    }, REQMock);

    let camaEncontrada: any = await findById({ organizacion, capa, ambito }, idCama, moment().subtract(1, 'minutes').toDate());
    expect(camaEncontrada.estado).toBe('ocupada');
    await InternacionController.deshacerInternacion(camaEncontrada.organizacion._id, capa, ambito, camaEncontrada.idInternacion, false, REQMock);

    camaEncontrada = await findById({ organizacion, capa, ambito }, idCama, moment().subtract(1, 'minutes').toDate());
    expect(camaEncontrada.estado).toBe('disponible');
});
