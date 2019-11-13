const mongoose = require('mongoose');
const bodyParser = require('body-parser');
import * as moment from 'moment';

import { MongoMemoryServer } from 'mongodb-memory-server-global';

import { store, findById, search, patch } from './camas.controller';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import { CamaEstados } from './cama-estados.schema';
import { EstadosCtr } from './estados.routes';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer: any;
beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});


function seedCama() {
    return {
        organizacion: {
            id: '57f67a7ad86d9f64130a138d',
            nombre: 'HOSPITAL NEUQUEN'
        },
        ambito: 'internacion',
        unidadOrganizativa: {
            refsetIds: [],
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
        censable: true,
        movimiento: true
    };
}

describe('Internacion - camas', () => {

    beforeAll(async () => {

    });


    test('create cama', async () => {

        const cama: any = await store(seedCama());

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
        await Promise.all(test);
    });

    test('cama - findById', async () => {
        const cama: any = await store(seedCama());
        const camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada._id.toString()).toBe(cama._id.toString());
        expect(camaEncontrada.nombre).toBe(cama.nombre);


        const camas = await search({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, {});

        expect(camas.length).toBe(2);

        const camasFiltradas = await search({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, { cama: cama._id });

        expect(camasFiltradas.length).toBe(1);

    });

    test('cama - patch de estados', async () => {
        const cama: any = await store(seedCama());
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
        }, null);

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
        }, null);


        const estados = await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'inactiva',
            fecha: moment().add(1, 'h').toDate(),
            organizacion: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        });

        const camaDB: any = await Camas.findById(cama._id);
        expect(camaDB.tipoCama.conceptId).toBe('1234567890');

        let camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'h').toDate());


        expect(camaEncontrada.estado).toBe('inactiva');

        camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'enfermeria', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada.estado).toBe('disponible');


        const resultNull = await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'medica',
            estado: 'disponible',
            fecha: moment().add(2, 'h').toDate(),
            organizacion: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            tipoCama: {
                fsn: 'cama saturada (objeto físico)',
                term: 'cama saturada',
                conceptId: '1234567890',
                semanticTag: 'objeto físico'
            }
        });
        expect(resultNull).toBeNull();

        camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'h').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');


        await patch({
            id: cama._id,
            ambito: 'internacion',
            capa: 'enfermeria',
            estado: 'ocupada',
            fecha: moment().add(2, 'month').toDate(),
            organizacion: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'HOSPITAL NEUQUEN'
            },
            paciente: {
                id: '57f67a7ad86d9f64130a138d',
                _id: '57f67a7ad86d9f64130a138d',
                nombre: 'JUANCITO',
                apellido: 'PEREZ',
                documento: '38432297'
            }
        });

        camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'medica', ambito: 'internacion' }, cama._id, moment().add(3, 'month').toDate());
        expect(camaEncontrada.estado).toBe('inactiva');

        camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'enfermeria', ambito: 'internacion' }, cama._id);
        expect(camaEncontrada.estado).toBe('disponible');

        camaEncontrada = await findById({ organizacion: '57f67a7ad86d9f64130a138d', capa: 'enfermeria', ambito: 'internacion' }, cama._id, moment().add(3, 'month').toDate());
        expect(camaEncontrada.estado).toBe('ocupada');

        const _estados = await CamaEstados.find({
            idOrganizacion: mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'),
            idCama: cama._id,
            ambito: 'internacion',
            capa: 'enfermeria'
        });
        expect(_estados.length).toBe(2);
    });

});
