import * as moment from 'moment';
import { Types } from 'mongoose';
import { Prestacion } from '../schemas/prestacion';
import { store, findById, search, patch, changeTime, listaEspera } from './camas.controller';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';
import { Estados } from './estados.schema';
import * as CamasEstadosController from './cama-estados.controller';
import { EstadosCtr } from './estados.routes';
import { Auth } from '../../../auth/auth.class';
import { patch as patchEstados } from './cama-estados.controller';
import { integrityCheck as checkIntegridad } from './camas.controller';
import { createInternacionPrestacion, estadoOcupada } from './test-utils';
import { getFakeRequest, setupUpMongo } from '@andes/unit-test';

const ambito = 'internacion';
const capa = 'medica';
let cama: any;
let idCama: any;
let organizacion: any;

const REQMock = getFakeRequest();

setupUpMongo();

function seedCama(cantidad, unidad, unidadOrganizativaCama = null) {
    return {
        esMovimiento: true,
        fecha: moment().subtract(cantidad, unidad).toDate(),
        organizacion: {
            _id: Types.ObjectId('57e9670e52df311059bc8964'),
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

describe('Internacion - camas', () => {
    beforeEach(async () => {
        await Camas.remove({});
        await CamaEstados.remove({});
        await Estados.remove({});
        await Prestacion.remove({});
        cama = await store(seedCama(1, 'h') as any, REQMock);
        idCama = String(cama._id);
        organizacion = cama.organizacion._id;
    });

    test('create cama', async () => {
        const camaDB: any = await Camas.findById(idCama);
        const test = INTERNACION_CAPAS.map(async (internacionCapa) => {
            const camaEstadoDB: any = await CamaEstados.find({
                idOrganizacion: organizacion,
                ambito,
                capa: internacionCapa,
                idCama,
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
        const camaEncontrada = await findById({ organizacion, capa, ambito }, idCama);
        expect(camaEncontrada._id.toString()).toBe(cama._id.toString());
        expect(camaEncontrada.nombre).toBe(cama.nombre);

        const camas = await search({ organizacion, capa, ambito }, {});

        expect(camas.length).toBe(1);
        expect(camas[0].createdAt).toBeDefined();

        const camasFiltradas = await search({ organizacion, capa, ambito }, { cama: idCama });

        expect(camasFiltradas.length).toBe(1);

    });

    test('cama - patch de estados', async () => {
        const maquinaEstados = await EstadosCtr.create({
            organizacion,
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
            organizacion,
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
            organizacion: cama.organizacion,
            id: idCama,
            esMovimiento: true,
            ambito,
            capa,
            estado: 'inactiva',
            fecha: moment().subtract(3, 'minute').toDate()
        }, REQMock);

        let camaEncontrada = await findById({ organizacion, capa, ambito }, idCama, moment().subtract(1, 'minutes').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');

        const resultNull = await patch({
            organizacion: cama.organizacion,
            ambito,
            capa,
            id: idCama,
            esMovimiento: true,
            estado: 'disponible',
            fecha: moment().subtract(30, 'seconds').toDate()
        }, REQMock);
        expect(resultNull).toBeNull();

        camaEncontrada = await findById({ organizacion, capa, ambito }, cama._id, moment().add(3, 'h').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');
    });

    test('Cama - Lista Espera con Cama Disponible', async () => {
        const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
        Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
        await nuevaPrestacion.save();

        const listaEsp = await listaEspera({ fecha: null, organizacion: cama.organizacion, ambito, capa: 'estadistica' });
        expect(listaEsp.length).toBe(1);
        expect(listaEsp[0]._id.toString()).toBe('5d3af64ec8d7a7158e12c242');

    });

    test('Cama - Lista Espera con Cama Ocupada', async () => {
        const nuevoOcupado = estadoOcupada(new Date());
        await CamasEstadosController.store({ organizacion, ambito, capa: 'estadistica', cama: String(cama._id) }, nuevoOcupado, REQMock);

        const nuevaPrestacion: any = new Prestacion(createInternacionPrestacion(cama.organizacion));
        Auth.audit(nuevaPrestacion, ({ user: {} }) as any);
        await nuevaPrestacion.save();

        const listaEsp = await listaEspera({ fecha: null, organizacion: cama.organizacion, ambito, capa: 'estadistica' });
        expect(listaEsp.length).toBe(1);
        expect(listaEsp[0]._id.toString()).toBe('5d3af64ec8d7a7158e12c242');

    });

    test('update fecha de un estado', async () => {
        await EstadosCtr.create({
            organizacion,
            ambito,
            capa,
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

        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'inactiva',
            fecha: from,
            organizacion: cama.organizacion,
            esMovimiento: true,
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        }, REQMock);

        await patchEstados({ organizacion, capa, ambito, cama: cama._id }, from, to);

        const camaEncontrada = await findById({ organizacion, capa, ambito }, cama._id, moment().add(3, 'h').toDate());
        expect(camaEncontrada.fecha.toISOString()).toBe(to.toISOString());

    });

    test('update fecha de un estado fallida', async () => {
        await EstadosCtr.create({
            organizacion,
            ambito,
            capa,
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

        const fechaIngreso = moment().add(2, 'hour').toDate();
        await patch({
            id: idCama,
            ambito,
            capa,
            estado: 'ocupada',
            fecha: fechaIngreso,
            esMovimiento: true,
            organizacion: cama.organizacion,
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
            ambito,
            capa,
            estado: 'ocupada',
            fecha: fechaPase,
            organizacion: cama.organizacion,
            esMovimiento: true,
            unidadOrganizativa: {
                fsn: 'servicio de adicciones (medio ambiente)',
                term: 'servicio de adicciones',
                conceptId: '4561000013103',
                semanticTag: 'medio ambiente'
            }
        }, REQMock);


        const fechaNuevaIngreso = moment().add(4, 'hour').toDate();
        const mustBeNull = await changeTime({ organizacion, capa, ambito }, idCama, fechaIngreso, fechaNuevaIngreso, '57f67a7ad86d9f64130a138d', REQMock);
        expect(mustBeNull).toBe(false);

    });

    test('Fallo de integridad en cama - Inactiva > Ocupada', async () => {
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
            fecha: moment().add(2, 'hours').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297',
                sexo: ''
            }
        }, REQMock);

        // INACTIVA LA CAMA ANTES DE OCUPARLA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'inactiva',
            esMovimiento: true,
            fecha: moment().add(1, 'hours').toDate(),
            organizacion: cama.organizacion,
        }, REQMock);

        const integrity = await checkIntegridad(
            {
                organizacion: cama.organizacion,
                ambito,
                capa,
            },
            {
                cama: null,
                from: null,
                to: moment().add(4, 'h').toDate()
            }
        );

        expect(integrity.length).toBe(1);
        expect(integrity[0].source.estado).toBe('inactiva');
        expect(integrity[0].target.estado).toBe('ocupada');
    });

    test('Fallo de integridad en cama - Inactiva > Bloqueada', async () => {
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

        // BLOQUEA CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'bloqueada',
            fecha: moment().add(2, 'hours').toDate(),
            organizacion: cama.organizacion,
            esMovimiento: true
        }, REQMock);

        // INACTIVA CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'inactiva',
            fecha: moment().add(1, 'hours').toDate(),
            organizacion: cama.organizacion,
            esMovimiento: true
        }, REQMock);

        const integrity = await checkIntegridad(
            {
                organizacion: cama.organizacion,
                ambito,
                capa
            },
            {
                cama: null,
                from: null,
                to: moment().add(6, 'h').toDate()
            }
        );

        expect(integrity.length).toBe(1);
        expect(integrity[0].source.estado).toBe('inactiva');
        expect(integrity[0].target.estado).toBe('bloqueada');
    });

    test('Fallo de integridad en cama - Ocupada > Ocupada', async () => {
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
            fecha: moment().add(2, 'hours').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            idInternacion: '57f67a7ad86d9f64130a138d',
            esMovimiento: true
        }, REQMock);

        // OCUPADA CON OTRO PACIENTE
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'ocupada',
            fecha: moment().add(1, 'hours').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            idInternacion: '57f67a7ad86d9f64130a13ac',
            esMovimiento: true
        }, REQMock);

        const integrity = await checkIntegridad(
            {
                organizacion: cama.organizacion,
                ambito,
                capa
            },
            {
                cama: null,
                from: null,
                to: moment().add(4, 'h').toDate()
            }
        );

        expect(integrity.length).toBe(1);
        expect(integrity[0].source.estado).toBe('ocupada');
        expect(integrity[0].target.estado).toBe('ocupada');
    });

    test('Fallo de integridad en cama - Bloqueada > Ocupada', async () => {
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
            fecha: moment().subtract(1, 'minutes').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            esMovimiento: true
        }, REQMock);

        // BLOQUEAR CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'bloqueada',
            fecha: moment().subtract(2, 'minutes').toDate(),
            organizacion: cama.organizacion,
            esMovimiento: true
        }, REQMock);

        const integrity = await checkIntegridad(
            {
                organizacion: cama.organizacion,
                ambito,
                capa
            },
            {
                cama: null,
                from: null,
                to: null
            }
        );

        expect(integrity.length).toBe(1);
        expect(integrity[0].source.estado).toBe('bloqueada');
        expect(integrity[0].target.estado).toBe('ocupada');
    });

    test('Fallo de integridad en cama - Bloqueada > Inactiva', async () => {
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

        // INACTIVAR CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'inactiva',
            fecha: moment().subtract(15, 'minutes').toDate(),
            organizacion: cama.organizacion,
            esMovimiento: true
        }, REQMock);

        // BLOQUEAR CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'bloqueada',
            fecha: moment().subtract(30, 'minutes').toDate(),
            organizacion: cama.organizacion,
            esMovimiento: true
        }, REQMock);

        const integrity = await checkIntegridad(
            {
                organizacion: cama.organizacion,
                ambito,
                capa
            },
            {
                cama: cama._id,
                from: null,
                to: null
            }
        );

        expect(integrity.length).toBe(1);
        expect(integrity[0].source.estado).toBe('bloqueada');
        expect(integrity[0].target.estado).toBe('inactiva');
    });

    test('Extras de ingreso', async () => {
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
            fecha: moment().subtract(1, 'minutes').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            esMovimiento: true,
            extras: {
                ingreso: true
            }
        }, REQMock);

        const camasConExtra = await search({ organizacion, capa, ambito }, { cama: cama._id });
        expect(camasConExtra.length).toBe(1);
        expect(camasConExtra[0].extras.ingreso).toBe(true);
    });

    test('Extras de egreso', async () => {
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

        // OCUPA LA CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'ocupada',
            fecha: moment().subtract(1, 'minutes').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            esMovimiento: true,
            extras: {
                ingreso: true
            }
        }, REQMock);

        const idInternacion = Types.ObjectId();
        // LIBERA CAMA
        await patch({
            organizacion: cama.organizacion,
            ambito,
            capa,
            id: cama._id,
            esMovimiento: true,
            extras: {
                egreso: true,
                tipo_egreso: 'Defuncion',
                idInternacion
            },
            estado: 'disponible',
            fecha: moment().subtract(30, 'seconds').toDate()
        }, REQMock);

        expect(maquinaEstados.createdAt).toBeDefined();
        expect(maquinaEstados.createdBy.nombre).toBe(REQMock.user.usuario.nombre);

        const camasConExtra = await search({ organizacion, capa, ambito }, { cama: cama._id });
        expect(camasConExtra.length).toBe(1);
        expect(camasConExtra[0].extras.egreso).toBe(true);
        expect(camasConExtra[0].extras.tipo_egreso).toBe('Defuncion');
        expect(String(camasConExtra[0].extras.idInternacion)).toBe(String(idInternacion));
    });

    test('Extras de movimiento', async () => {
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

        // OCUPA LA CAMA
        await patch({
            id: cama._id,
            ambito,
            capa,
            estado: 'ocupada',
            fecha: moment().subtract(1, 'minutes').toDate(),
            organizacion: cama.organizacion,
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            },
            esMovimiento: true,
            extras: {
                ingreso: true
            }
        }, REQMock);

        const unidadOrganizativaOrigen = {
            refsetIds: [],
            fsn: 'departamento de rayos X (medio ambiente)',
            term: 'departamento de rayos X',
            conceptId: '225747005',
            semanticTag: 'medio ambiente',
        };
        // LIBERA CAMA
        await patch({
            organizacion: cama.organizacion,
            ambito,
            capa,
            id: cama._id,
            esMovimiento: true,
            extras: {
                unidadOrganizativaOrigen
            },
            estado: 'disponible',
            fecha: moment().subtract(30, 'seconds').toDate()
        }, REQMock);

        expect(maquinaEstados.createdAt).toBeDefined();
        expect(maquinaEstados.createdBy.nombre).toBe(REQMock.user.usuario.nombre);

        const camasConExtra = await search({ organizacion, capa, ambito }, { cama: cama._id });
        expect(camasConExtra.length).toBe(1);
        expect(camasConExtra[0].extras.unidadOrganizativaOrigen.conceptId).toBe(unidadOrganizativaOrigen.conceptId);
    });
});

