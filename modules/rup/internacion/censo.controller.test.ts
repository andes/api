const mongoose = require('mongoose');
const bodyParser = require('body-parser');
import { store, findById, search, patch } from './camas.controller';
import * as CamasEstadosController from './cama-estados.controller';
import { model as Prestaciones } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';

import * as moment from 'moment';

import { MongoMemoryServer } from 'mongodb-memory-server-global';

import * as CensoController from './censo.controller';
import { Auth } from '../../../auth/auth.class';

const REQMock: any = {
    user: {}
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer: any;
let cama: any;

beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    // const mongoUri = 'mongodb://localhost:27017/andes';
    mongoose.connect(mongoUri);
});

beforeEach(async () => {
    await Camas.remove({});
    await CamaEstados.remove({});
    await Prestaciones.remove({});
    cama = await store(seedCama() as any, REQMock);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

function seedCama() {
    return {
        fecha: moment().subtract(2, 'day'),
        organizacion: {
            _id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            nombre: 'HOSPITAL NEUQUEN'
        },
        ambito: 'internacion',
        unidadOrganizativa: {
            fsn: 'servicio de adicciones (medio ambiente)',
            term: 'servicio de adicciones',
            conceptId: '4561000013106',
            semanticTag: 'medio ambiente',
            _id: mongoose.Types.ObjectId('5c8a88e2af621b10273ba23d'),
            id: mongoose.Types.ObjectId('5c8a88e2af621b10273ba23d')
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

test('censo diario', async () => {
    await CensoController.censoDiario({ organizacion: '5bae6b7b9677f95a425d9ee8', timestamp: moment('2019-01-04').toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });
});

test('Censo diario - vacio', async () => {
    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });
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
        disponibles: 1
    });
});

test('Censo diario - Paciente desde 0hs hasta 24hs', async () => {
    const nuevaPrestacion = new Prestaciones(prestacion());
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoEstadoCama = await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, estadoOcupada(), REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente desde 0hs tiene alta', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoEstadoCama = await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, estadoOcupada(), REQMock);
    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente desde 0hs tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().subtract(1, 'day').toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defuncion';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defuncion';

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoEstadoCama = await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, estadoOcupada(), REQMock);
    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente desde 0hs tiene pase A', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoEstadoCama = await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, estadoOcupada(), REQMock);
    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    nuevoOcupado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });

    const censoMan = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().add(1, 'd').toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });
    const censoManUO = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().add(1, 'd').toDate(), unidadOrganizativa: '5af19d078db89356597271fe' });

    expect(censoMan.censo).toEqual({
        existenciaALas0: 0,
        ingresos: 0,
        pasesDe: 0,
        altas: 0,
        defunciones: 0,
        pasesA: 0,
        existenciaALas24: 0,
        ingresosYEgresos: 0,
        pacientesDia: 0,
        disponibles: 0
    });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y se queda', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defuncion';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defuncion';
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene pase A', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    nuevoEstado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y se queda', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    nuevoEstado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);

    const nuevoEstadoVuelve = estadoOcupada();
    nuevoEstadoVuelve.fecha = moment(new Date()).add(45, 'minutes').toDate();

    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstadoVuelve, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    nuevoEstado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);

    const nuevoEstadoVuelve = estadoOcupada();
    nuevoEstadoVuelve.fecha = moment(new Date()).add(45, 'minutes').toDate();

    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstadoVuelve, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente ingresa y tiene paseA y luego paseDe y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defuncion';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defuncion';
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    nuevoEstado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);

    const nuevoEstadoVuelve = estadoOcupada();
    nuevoEstadoVuelve.fecha = moment(new Date()).add(45, 'minutes').toDate();

    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstadoVuelve, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente tiene paseDe y se queda', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    nuevoOcupado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);


    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente tiene paseDe y tiene alta', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    nuevoOcupado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);


    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente tiene paseDe y tiene defuncion', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    nuevaPrestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.fechaEgreso = moment().toDate();
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.id = 'Defuncion';
    nuevaPrestacion.ejecucion.registros[1].valor.InformeEgreso.tipoEgreso.nombre = 'Defuncion';

    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    nuevoOcupado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);


    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

test('Censo diario - Paciente tiene paseDe y tiene paseA', async () => {
    const nuevaPrestacion: any = new Prestaciones(prestacion());
    Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
    await nuevaPrestacion.save();

    const nuevoOcupado = estadoOcupada();
    nuevoOcupado.fecha = moment().toDate();
    nuevoOcupado.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

    const nuevoEstado = estadoOcupada();
    nuevoEstado.fecha = moment(new Date()).add(30, 'minutes').toDate();
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstado, REQMock);

    const nuevoEstadoPase = estadoOcupada();
    nuevoEstadoPase.fecha = moment(new Date()).add(45, 'minutes').toDate();
    nuevoEstadoPase.unidadOrganizativa = {
        _id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        id: mongoose.Types.ObjectId('5af19d078db89356597271fe'),
        fsn: 'departamento de neuropatología (medio ambiente)',
        term: 'departamento de neuropatología',
        conceptId: '309957000',
        semanticTag: 'medio ambiente',
    };
    await CamasEstadosController.store({ organizacion: '57f67a7ad86d9f64130a138d', ambito: 'internacion', capa: 'estadistica', cama: String(cama._id) }, nuevoEstadoPase, REQMock);

    const resultado = await CensoController.censoDiario({ organizacion: '57f67a7ad86d9f64130a138d', timestamp: moment().toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });

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
        disponibles: 0
    });
});

function estadoOcupada() {
    return {
        fecha: moment().subtract(1, 'day').toDate(),
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
                    nombre: 'HOSPITAL AÑELO',
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
                    nombre: 'HOSPITAL AÑELO',
                    id: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d')
                }
            },
            cuil: '27406163542',
            reportarError: false
        },
        idInternacion: mongoose.Types.ObjectId('5d3af64ec8d7a7158e12c242'),
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
                nombre: 'HOSPITAL AÑELO'
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
                            fechaIngreso: moment().subtract(1, 'day').toDate(),
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
                nombre: 'HOSPITAL AÑELO',
                id: mongoose.Types.ObjectId('5bae6b7b9677f95a425d9ee8')
            }
        }
    };
}
