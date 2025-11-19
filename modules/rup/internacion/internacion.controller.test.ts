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
import { InformeEstadistica } from './informe-estadistica.schema';
const REQMock = getFakeRequest();


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
    await InformeEstadistica.remove({});
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

async function storeInternacion({ paciente = paciente1, organizacionOverride, unidadOrganizativaOverride, fechaIngreso = moment().toDate() }: { paciente?: any; organizacionOverride?: any; unidadOrganizativaOverride?: any; fechaIngreso?: Date } = {}) {
    const organizacionLocal = organizacionOverride || {
        _id: mongoose.Types.ObjectId('57e9670e52df311059bc8964'),
        nombre: 'HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON'
    };

    const unidadOrganizativa = unidadOrganizativaOverride || {
        fsn: 'unidad test',
        term: 'unidad test',
        conceptId: '0001',
        semanticTag: 'unidad'
    };

    const ingreso = {
        fechaIngreso,
        origen: {
            tipo: 'internacion',
            organizacionOrigen: organizacionLocal
        },
        profesional: paciente,
        motivo: 'Ingreso por test'
    };
    const nuevoInforme: any = new InformeEstadistica({
        organizacion: organizacionLocal,
        unidadOrganizativa,
        paciente,
        informeIngreso: ingreso,
        periodosCensables: [{
            desde: moment(fechaIngreso).startOf('day').toDate(),
            hasta: moment(fechaIngreso).endOf('day').toDate()
        }],
        estados: [{ tipo: 'ejecucion', fecha: fechaIngreso }],
        estadoActual: { tipo: 'ejecucion' }
    });

    if (process.env.NODE_ENV !== 'test') {
        await nuevoInforme.save();
    }

    try {
        Auth.audit(nuevoInforme, REQMock);
    } catch (e) {
    }

    try {
        const saved = await nuevoInforme.save();
        return saved;
    } catch (err) {
        throw err;
    }
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
    await EstadosCtr.create({
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
            { origen: 'ocupada', destino: 'disponible' }
        ]
    }, REQMock);

    const fechaIngreso = moment().startOf('day').add(10, 'minutes').toDate(); // bien temprano
    const fechaConsulta = moment().endOf('day').toDate();// para findById

    await patchEstados({
        id: cama._id,
        ambito,
        capa,
        estado: 'ocupada',
        esMovimiento: true,
        fecha: internacion.informeIngreso.fechaIngreso,
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

    let camaEncontrada = await findById(
        { organizacion, capa, ambito },
        idCama,
        fechaConsulta
    );

    expect(camaEncontrada.estado).toBe('ocupada');

    await InternacionController.deshacerInternacion(
        camaEncontrada.organizacion._id.toString(),
        capa,
        ambito,
        camaEncontrada.idInternacion.toString(),
        false,
        REQMock
    );

    camaEncontrada = await findById(
        { organizacion, capa, ambito },
        idCama,
        fechaConsulta
    );

    expect(camaEncontrada.estado).toBe('disponible');
});
