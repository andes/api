const mongoose = require('mongoose');

import { store, patch, findById } from './camas.controller';
import { ingresarPaciente } from './sala-comun/sala-comun.controller';
import { Prestacion } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';
import { SalaComun, SalaComunSnapshot } from './sala-comun/sala-comun.schema';
import { SalaComunMovimientos } from './sala-comun/sala-comun-movimientos.schema';
import * as InternacionController from './internacion.controller';
import { SalaComunCtr } from './sala-comun/sala-comun.routes';

import * as moment from 'moment';
import { getFakeRequest, getObjectId, setupUpMongo } from '@andes/unit-test';
import { EstadosCtr } from './estados.routes';
import { createPaciente, createUnidadOrganizativa } from './test-utils';

const REQMock = getFakeRequest();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

const ambito = 'internacion';
const capa = 'estadistica';
let cama: any;
let internacion = getObjectId('internacion');
let organizacion: any;
const paciente1 = createPaciente('10000000');
let idCama;
let unidadOrganizativa;

setupUpMongo();

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestacion.remove({});
    await SalaComun.remove({});
    await SalaComunSnapshot.remove({});
    await SalaComunMovimientos.remove({});

    (REQMock as any).user.organizacion['id'] = '57e9670e52df311059bc8964';
    (REQMock as any).user.organizacion['nombre'] = 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON9670e52df311059bc8964';
    cama = await store(seedCama(1, 'y') as any, REQMock);
    organizacion = cama.organizacion._id;
    idCama = String(cama._id);
    unidadOrganizativa = cama.unidadOrganizativaOriginal.conceptId;
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
            idInternacion: internacion
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
                idInternacion: internacion,
                fecha: moment().subtract(2, 'd').toDate(),
                unidadOrganizativa: createUnidadOrganizativa('123456789')
            },
            REQMock
        );
        const historialInternacion = await InternacionController.obtenerHistorialInternacion(organizacion, capa, internacion, moment().subtract(4, 'month').toDate(), moment().toDate());
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
    await patch({
        id: cama._id,
        ambito,
        capa,
        estado: 'ocupada',
        esMovimiento: true,
        fecha: moment().subtract(2, 'hours').toDate(),
        organizacion: cama.organizacion,
        extras: { ingreso: true },
        idInternacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a136e'),
        paciente: {
            id: '57f67a7ad86d9f64130a138d',
            _id: '57f67a7ad86d9f64130a138d',
            nombre: 'JUANCITO',
            apellido: 'PEREZ',
            documento: '38432297',
            sexo: ''
        }
    }, REQMock);

    let camaEncontrada = await findById({ organizacion, capa, ambito }, idCama, moment().subtract(1, 'minutes').toDate());
    expect(camaEncontrada.estado).toBe('ocupada');

    await InternacionController.deshacerInternacion(camaEncontrada.organizacion._id, capa, ambito, camaEncontrada, REQMock);

    camaEncontrada = await findById({ organizacion, capa, ambito }, idCama, moment().subtract(1, 'minutes').toDate());
    expect(camaEncontrada.estado).toBe('disponible');
});
