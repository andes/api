const mongoose = require('mongoose');
import { Types } from 'mongoose';
import * as moment from 'moment';
import { MongoMemoryServer } from 'mongodb-memory-server-global';
import { Auth } from '../../../auth/auth.class';
import { Prestacion } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
import { CamaEstados } from './cama-estados.schema';
import { storeEstados } from './camas.controller';
import { Camas } from './camas.schema';
import * as CensoController from './censo.controller';
import { createInternacionPrestacion, estadoOcupada } from './test-utils';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

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
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoose.connect(mongoUri);
});

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestacion.remove({});
    await Organizacion.remove({});

    let newOrganizacion = new Organizacion({
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
    newOrganizacion = await newOrganizacion.save();
    organizacion = newOrganizacion.id;

    cama = new Camas(seedCama(1, 'y'));
    cama.audit(REQMock);
    cama = await cama.save();
    const dataEstados = {
        ...seedCama(1, 'y'),
        _id: cama._id
    };
    await storeEstados(dataEstados, REQMock);;
    idCama = String(cama._id);
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
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;
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
        diasEstada: 0,
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
        diasEstada: 1,
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
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs tiene pase A', async () => {
    let cama2: any = new Camas(seedCama(1, 'y', otraUnidadOrganizativa));
    cama2.audit(REQMock);
    cama2 = await cama2.save();
    await storeEstados(cama2, REQMock);
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;

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

    const extras = { unidadOrganizativaOrigen: cama.unidadOrganizativaOriginal };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: String(cama2._id) },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa, extras),
        REQMock
    );

    const resultado = await CensoController.censoDiario({ organizacion, timestamp: moment().toDate(), unidadOrganizativa });

    expect(resultado.censo).toEqual({
        existenciaALas0: 1,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 1,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        disponibles: 1,
        diasEstada: 1
    });

    const censoManUO = await CensoController.censoDiario({ organizacion, timestamp: moment().add(1, 'd').toDate(), unidadOrganizativa: otraUnidadOrganizativa.conceptId });

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
        diasEstada: 0,
        disponibles: 1
    });
});

test('Censo diario - Paciente ingresa y se queda', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'minute').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();
    await CamasEstadosController.store(
        {
            organizacion,
            ambito,
            capa,
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
        diasEstada: 0,
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
        organizacion,
        ambito,
        capa,
        cama: idCama
    }, estadoOcupada(
        moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
    REQMock
    );

    await CamasEstadosController.store({
        organizacion,
        ambito,
        capa,
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
            organizacion,
            ambito,
            capa,
            cama: idCama
        },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

    await CamasEstadosController.store({
        organizacion,
        ambito,
        capa,
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
    let cama2: any = new Camas(seedCama(1, 'y', otraUnidadOrganizativa));
    cama2.audit(REQMock);
    cama2 = await cama2.save();
    await storeEstados(cama2, REQMock);
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

    const extras = { unidadOrganizativaOrigen: cama.unidadOrganizativaOriginal };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: String(cama2._id) },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa, extras),
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
    let extras = { unidadOrganizativaOrigen: cama.unidadOrganizativaOriginal };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa, extras),
        REQMock
    );
    extras = { unidadOrganizativaOrigen: otraUnidadOrganizativa };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal, extras),
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
        diasEstada: 1,
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
        diasEstada: 1,
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
    let extras = { unidadOrganizativaOrigen: cama.unidadOrganizativaOriginal };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa, extras),
        REQMock
    );
    extras = { unidadOrganizativaOrigen: otraUnidadOrganizativa };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal, extras),
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
        diasEstada: 1,
        disponibles: 1
    });
});

test('Censo diario - Paciente tiene paseDe y se queda', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(2, 'minutes').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, otraUnidadOrganizativa),
        REQMock
    );
    const extras = { unidadOrganizativaOrigen: otraUnidadOrganizativa };

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal, extras),
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
        diasEstada: 0,
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
    let cama2: any = new Camas(seedCama(1, 'y', otraUnidadOrganizativa));
    cama2.audit(REQMock);
    cama2 = await cama2.save();
    await storeEstados(cama2, REQMock);
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

    let extras = { unidadOrganizativaOrigen: otraUnidadOrganizativa };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(2, 'm').toDate(), internacion._id, cama.unidadOrganizativaOriginal, extras),
        REQMock
    );

    await CamasEstadosController.store({ organizacion, ambito, capa, cama: idCama },
        estadoDisponible(cama.unidadOrganizativaOriginal, 1, 'minutes'), REQMock);

    extras = { unidadOrganizativaOrigen: cama.unidadOrganizativaOriginal };
    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: cama2._id },
        estadoOcupada(moment().subtract(1, 'm').toDate(), internacion._id, otraUnidadOrganizativa, extras),
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


test('Censo diario - Prestación con periodos censables incluyentes', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(10, 'd').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;
    nuevaPrestacion.periodosCensables = [{ desde: moment().subtract(1, 'd'), hasta: moment().add(1, 'd') }];

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(10, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
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
        diasEstada: 0,
        disponibles: 1
    });
});

test('Censo diario - Prestación con periodos censables excluyentes', async () => {
    const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(10, 'd').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = null;
    nuevaPrestacion.periodosCensables = [{ desde: moment().add(1, 'd'), hasta: moment().add(3, 'd') }];

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    const internacion = await nuevaPrestacion.save();

    await CamasEstadosController.store(
        { organizacion, ambito, capa, cama: idCama },
        estadoOcupada(moment().subtract(10, 'd').toDate(), internacion._id, cama.unidadOrganizativaOriginal),
        REQMock
    );

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
