const mongoose = require('mongoose');

import { store, findById, search, patch } from './camas.controller';
import * as CamasEstadosController from './cama-estados.controller';
import { Prestacion } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';

import * as moment from 'moment';

import { MongoMemoryServer } from 'mongodb-memory-server-global';

import * as CensoController from './censo.controller';
import { Auth } from '../../../auth/auth.class';
import { createInternacionPrestacion, estadoOcupada } from './test-utils';

const REQMock: any = {
    user: {}
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer: any;
const ambito = 'internacion';
const capa = 'estadistica';
let cama: any;
let idCama: any;
let organizacion: any;
let unidadOrganizativa: any;
const otraUnidadOrganizativa = {
    fsn: 'departamento de neuropatología (medio ambiente)',
    term: 'departamento de neuropatología',
    conceptId: '309957000',
    semanticTag: 'medio ambiente'
};

beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    mongoose.connect(mongoUri);
});

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestacion.remove({});
    cama = await store(seedCama(1, 'y') as any, REQMock);
    idCama = String(cama._id);
    organizacion = cama.organizacion._id;
    unidadOrganizativa = cama.unidadOrganizativaOriginal.conceptId;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

test('censo diario', async () => {
    await CensoController.censoDiario({ organizacion, timestamp: moment('2019-01-04').toDate(), unidadOrganizativa });
});

test('Censo diario - vacio', async () => {
    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });
    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 0,
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs hasta 24hs', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'd').toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 1,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 1,
        ingresosYEgresos: 0,
        pacientesDia: 1,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs tiene alta', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().subtract(1, 'minute').toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minute'),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 1,
        ingresos: 0,
        pasesDe: 0,
        altas: 1,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().subtract(1, 'hour').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defunción';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defunción';

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: new Date(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 1,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 1,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs tiene pase A', async () => {
    const cama2 = await store(seedCama(1, 'y', otraUnidadOrganizativa) as any, REQMock);
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();


    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoDisponible(cama.unidadOrganizativaOriginal, 2, 'minute'),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: String(cama2._id) },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    // const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    // expect(resultado.censo).toEqual({
    //     existenciaALas0: 1,
    //     ingresos: 0,
    //     pasesDe: 0,
    //     altas: 0,
    //     defunciones: 0,
    //     pasesA: 1,
    //     existenciaALas24: 0,
    //     ingresosYEgresos: 0,
    //     pacientesDia: 0,
    //     disponibles: 1,
    //     diasEstada: 2
    // });

    // const censoMan = await CensoController.censoDiario({ organizacion, timestamp: moment().add(1, 'd').toDate(), unidadOrganizativa });
    const censoManUO = await CensoController.censoDiario({ organizacion, timestamp: moment().add(1, 'd').toDate(), unidadOrganizativa: otraUnidadOrganizativa.conceptId });

    // expect(censoMan.censo).toEqual({
    //     existenciaALas0: 0,
    //     ingresos: 0,
    //     pasesDe: 0,
    //     altas: 0,
    //     defunciones: 0,
    //     pasesA: 0,
    //     existenciaALas24: 0,
    //     ingresosYEgresos: 0,
    //     pacientesDia: 0,
    //     diasEstada: 0,
    //     disponibles: 1
    // });

    expect(censoManUO.censo).toEqual({
        existenciaALas0: 1,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 1,
        ingresosYEgresos: 0,
        pacientesDia: 1,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y se queda', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'minute').toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        {
            organizacion, ambito, capa,
            cama: idCama
        }, estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 1,
        ingresosYEgresos: 0,
        pacientesDia: 1,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minute').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().subtract(1, 'minute').toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store({
        organizacion, ambito, capa,
        cama: idCama
    }, estadoOcupada(
        moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
    REQMock
    );

    await CamasEstadosController.store({
        organizacion, ambito, capa,
        cama: idCama
    }, estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minute'), REQMock);

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 0,
        altas: 1,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 1,
        pacientesDia: 1,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minute').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().subtract(1, 'minute').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defunción';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defunción';
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        {
            organizacion, ambito, capa,
            cama: idCama
        },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store({
        organizacion, ambito, capa,
        cama: idCama
    }, estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minute'), REQMock);

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 0,
        altas: 0,
        defunciones: 1,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 1,
        pacientesDia: 1,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene pase A', async () => {
    const cama2 = await store(seedCama(1, 'y', otraUnidadOrganizativa) as any, REQMock);
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minute').toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store({ organizacion, ambito, capa, cama: idCama },
        estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minute'), REQMock);

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: String(cama2._id) },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 1,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y se queda', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(4, 'minutes').toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(4, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 1,
        altas: 0,
        defunciones: 0,
        pasesA: 1,
        existenciaALas24: 1,
        ingresosYEgresos: 0,
        pacientesDia: 1,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(4, 'minutes').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(4, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 1,
        altas: 1,
        defunciones: 0,
        pasesA: 1,
        existenciaALas24: 0,
        ingresosYEgresos: 1,
        pacientesDia: 1,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(4, 'minutes').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defunción';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defunción';
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(4, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 1,
        pasesDe: 1,
        altas: 0,
        defunciones: 1,
        pasesA: 1,
        existenciaALas24: 0,
        ingresosYEgresos: 1,
        pacientesDia: 1,
        diasEstada: 2,
        disponibles: 1
    });
});

test('Censo diario - Paciente tiene paseDe y se queda', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minutes').toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );


    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 1,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 1,
        ingresosYEgresos: 0,
        pacientesDia: 1,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente tiene paseDe y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minutes').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 1,
        altas: 1,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente tiene paseDe y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minutes').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defunción';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defunción';

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 1,
        altas: 0,
        defunciones: 1,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente tiene paseDe y tiene paseA', async () => {
    const cama2 = await store(seedCama(1, 'y', otraUnidadOrganizativa) as any, REQMock);
    const nuevaPrestacion: any = new Prestacion(
        createInternacionPrestacion(cama.organizacion, moment().add(4, 'd').toDate())
    );
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: cama2._id },
        estadoOcupada(moment().subtract(4, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store({ organizacion, ambito, capa, cama: idCama },
        estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minutes'), REQMock);

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: cama2._id },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 1,
        altas: 0,
        defunciones: 0,
        pasesA: 1,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        diasEstada: 1,
        disponibles: 1
    });
});

function estadoDisponible(unidadOrganizativaEstado, cantidad, unidad) {
    return {
        fecha: moment().subtract(cantidad, unidad).toDate(),
        estado: 'disponible',
        unidadOrganizativa: unidadOrganizativaEstado,
        especialidades: [
            {
                refsetIds: [],
                fsn: 'medicina general (calificador)',
                term: 'medicina general',
                conceptId: '394802001',
                semanticTag: 'calificador'
            }
        ],
        esCensable: true,
        genero: {
            refsetIds: [],
            fsn: 'género femenino (hallazgo)',
            term: 'género femenino',
            conceptId: '703118005',
            semanticTag: 'hallazgo'
        },
        idInternacion: null,
        observaciones: null,
        esMovimiento: true,
        sugierePase: null
    };
}

// function estadoOcupada(idInternacion, unidadOrganizativaEstado, cantidad, unidad) {
//     return {
//         fecha: moment().subtract(cantidad, unidad).toDate(),
//         estado: 'ocupada',
//         unidadOrganizativa: unidadOrganizativaEstado,
//         especialidades: [
//             {
//                 fsn: 'medicina general (calificador)',
//                 term: 'medicina general',
//                 conceptId: '394802001',
//                 semanticTag: 'calificador'
//             }
//         ],
//         esCensable: true,
//         genero: {

//             fsn: 'género femenino (hallazgo)',
//             term: 'género femenino',
//             conceptId: '703118005',
//             semanticTag: 'hallazgo'
//         },
//         paciente: {
//             claveBlocking: [
//                 'ANSRALN',
//                 'ANSRN',
//                 'ALNNTN',
//                 '6496566365',
//                 '6496'
//             ],
//             entidadesValidadoras: [
//                 'Sisa',
//                 'RENAPER'
//             ],
//             _id: mongoose.Types.ObjectId('5d3af64e5086740d0f5bc6b5'),
//             identificadores: [
//                 {
//                     entidad: 'SIPS',
//                     valor: '733776'
//                 }
//             ],
//             contacto: [
//                 {
//                     activo: true,
//                     _id: mongoose.Types.ObjectId('5cf4f5facdb7f026ed635a77'),
//                     tipo: 'celular',
//                     valor: '2995166965',
//                     ranking: 0,
//                     ultimaActualizacion: '2019-06-03T10:26:09.207Z'
//                 }
//             ],
//             direccion: [],
//             relaciones: [],
//             financiador: [],
//             carpetaEfectores: [],
//             notas: [],
//             documento: '40616354',
//             estado: 'validado',
//             nombre: 'AILEN ANTONELA',
//             apellido: 'ANZORENA',
//             sexo: 'femenino',
//             genero: 'femenino',
//             fechaNacimiento: '1997-11-01T03:00:00.000Z',
//             estadoCivil: null,
//             activo: true,
//             createdAt: '2019-04-09T10:15:12.355Z',
//             createdBy: {
//                 id: mongoose.Types.ObjectId('5ca4c38333a46481507661da'),
//                 nombreCompleto: 'Miriam Lorena Sanchez',
//                 nombre: 'Miriam Lorena',
//                 apellido: 'Sanchez',
//                 username: 29882039,
//                 documento: 29882039,
//                 organizacion: {
//                     _id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
//                     nombre: 'HOSPITAL AÑELO',
//                     id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d')
//                 }
//             },
//             scan: '00249041503@ANZORENA@AILN ANTONELA@F@40616354@A@01/11/1997@25/02/2014',
//             updatedAt: '2019-07-26T12:47:10.703Z',
//             updatedBy: {
//                 id: mongoose.Types.ObjectId('5b5a00ae43563f10834c067c'),
//                 nombreCompleto: 'MARIA RAQUEL MU�OZ',
//                 nombre: 'MARIA RAQUEL',
//                 apellido: 'MU�OZ',
//                 username: 27932209,
//                 documento: 27932209,
//                 organizacion: {
//                     _id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
//                     nombre: 'HOSPITAL AÑELO',
//                     id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d')
//                 }
//             },
//             cuil: '27406163542',
//             reportarError: false
//         },
//         idInternacion,
//         observaciones: null,
//         esMovimiento: true,
//         sugierePase: null
//     };
// }
