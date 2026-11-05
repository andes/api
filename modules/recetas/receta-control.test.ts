// Evita cargar services/integraciones externas (y @andes/match con TS sin transpilar)
// al importar recetasController. Para estos tests el servicio de receta no se usa.
jest.mock('./services/receta', () => ({ getReceta: jest.fn() }));
jest.mock('../../core-v2/mpi/validacion/validacion.controller', () => ({
    generarCUIL: (documento: string, sexo: string) => `CUIL-${documento}-${sexo}`
}));

import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
import { getFakeRequest, setupUpMongo } from '@andes/unit-test';
import { Prestacion } from '../rup/schemas/prestacion';
import { Profesional } from '../../core/tm/schemas/profesional';
import { Receta } from './receta-schema';
import { RecetaInsumo } from './recetasInsumos/receta-insumo.schema';
import { RecetaControl } from './receta-control-schema';
import { generarPrecargaReceta } from './recetasController';
import generarRecetasFaltantes = require('../../jobs/jobRecetaControl');

const REQMock = getFakeRequest();

const TEST_MONGO_URI = process.env.TEST_MONGO_URI;

if (TEST_MONGO_URI) {
    // Permite correr el test contra un Mongo local/disponible (por ejemplo en máquinas
    // donde mongodb-memory-server no puede levantar por compatibilidad de OpenSSL).
    const dbName = TEST_MONGO_URI.split('/').pop().split('?')[0];
    if (!/test/i.test(dbName)) {
        throw new Error('TEST_MONGO_URI debe apuntar a una base de prueba (el nombre debe contener "test")');
    }

    beforeAll(async () => {
        await mongoose.connect(TEST_MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true } as any);
    });

    afterAll(async () => {
        // Con TEST_MONGO_KEEP=1 se conservan los datos para poder inspeccionarlos en Mongo.
        if (!process.env.TEST_MONGO_KEEP) {
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    });
} else {
    setupUpMongo();
}

const conceptos = {
    medicamento: '111111111',
    magistral: '222222222',
    dispositivo: '333333333'
} as const;

function crearRegistro(valor: any, conceptId = '33633005') {
    return {
        _id: new Types.ObjectId(),
        nombre: 'Registro de prescripción',
        concepto: {
            conceptId,
            term: 'Prescripción',
            fsn: 'Prescripción (procedimiento)',
            semanticTag: 'procedimiento'
        },
        valor,
        esSolicitud: false,
        destacado: false
    };
}

function medicamento(conceptId: string = conceptos.medicamento, tiempoTratamiento: string = null) {
    return {
        generico: {
            conceptId,
            term: 'Ibuprofeno'
        },
        presentacion: { term: 'comprimidos' },
        unidades: 'mg',
        cantidad: 20,
        cantEnvases: 1,
        dosisDiaria: { dosis: '1 comprimido', intervalo: { nombre: '8 horas' }, dias: 5 },
        tratamientoProlongado: !!tiempoTratamiento,
        tiempoTratamiento: tiempoTratamiento ? { id: tiempoTratamiento, nombre: `${tiempoTratamiento} meses` } : null
    };
}

function insumo(codigo: string, tipo: 'dispositivo' | 'nutricion' = 'dispositivo') {
    return {
        generico: {
            tipo,
            nombre: tipo === 'dispositivo' ? 'Silla de ruedas' : 'Fórmula nutricional',
            codigo: [{ fuente: 'sifaho', valor: codigo }]
        },
        cantidad: 1,
        tratamientoProlongado: false,
        tiempoTratamiento: null
    };
}

async function crearProfesional(documento = '99999999') {
    const profesional = new Profesional({
        documento,
        nombre: 'Carla',
        apellido: 'Médica',
        formacionGrado: [{
            profesion: { codigo: 1, nombre: 'Médico' },
            matriculacion: [{ matriculaNumero: 12345 }]
        }]
    });
    profesional.audit(REQMock);
    return profesional.save();
}

async function crearPrestacion(registros: any[], profesional: any) {
    const pacienteId = new Types.ObjectId();
    const prestacion = new Prestacion({
        paciente: {
            id: pacienteId,
            nombre: 'Ana',
            apellido: 'Pérez',
            documento: '30111222',
            sexo: 'femenino',
            cuil: '27301112224'
        },
        solicitud: {
            fecha: new Date(),
            profesional: {
                id: profesional._id,
                nombre: profesional.nombre,
                apellido: profesional.apellido,
                documento: profesional.documento
            },
            tipoPrestacion: {
                conceptId: '3380006007',
                term: 'Consulta'
            },
            organizacion: {
                id: new Types.ObjectId(),
                nombre: 'Hospital de prueba'
            }
        },
        ejecucion: {
            fecha: new Date(),
            organizacion: {
                id: new Types.ObjectId(),
                nombre: 'Hospital de prueba'
            },
            registros
        },
        estados: [{ tipo: 'validada' }]
    });
    (prestacion as any).audit(REQMock);
    return prestacion.save();
}

async function crearControl(prestacionId: Types.ObjectId, registroId: Types.ObjectId, datos: any) {
    const control = new RecetaControl({
        idPrestacion: prestacionId,
        idRegistro: registroId,
        idPaciente: new Types.ObjectId(),
        tipo: 'medicamento',
        nombre: 'Ibuprofeno',
        identificador: [{ fuente: 'snomed', valor: conceptos.medicamento }],
        tratamientoProlongado: false,
        cantTotalRecetas: 1,
        intento: 0,
        estado: 'pendiente',
        recetas: [],
        ...datos
    });
    (control as any).audit(REQMock);
    return control.save();
}

function ejecutarJob() {
    return new Promise<void>((resolve, reject) => {
        generarRecetasFaltantes(
            { minutosHasta: 0, hasta: moment().add(1, 'day').toDate() },
            (err) => err ? reject(err) : resolve()
        );
    });
}

beforeEach(async () => {
    await Promise.all([
        RecetaControl.deleteMany({}),
        Receta.deleteMany({}),
        RecetaInsumo.deleteMany({}),
        Prestacion.deleteMany({}),
        Profesional.deleteMany({}),
        mongoose.connection.collection('counters').deleteMany({})
    ]);
});

describe('generarPrecargaReceta', () => {
    test('crea controles para medicamentos, magistrales e insumos e ignora registros sin prescripción', async () => {
        const prestacion = {
            _id: new Types.ObjectId(),
            paciente: {
                id: new Types.ObjectId(),
                nombre: 'Ana',
                apellido: 'Pérez',
                documento: '30111222',
                sexo: 'femenino'
            }
        };

        const registroMedicamento = crearRegistro({
            medicamentos: [
                medicamento(conceptos.medicamento, '2'),
                {
                    esMagistral: true,
                    magistral: {
                        nombre: 'Fórmula magistral',
                        codigo: [{ fuente: 'sifaho', valor: conceptos.magistral }]
                    }
                }
            ]
        });

        const registroInsumo = crearRegistro({
            insumos: [insumo(conceptos.dispositivo)]
        }, '313047003');

        const registroSinPrescripcion = crearRegistro({ observaciones: 'sin receta' });

        await generarPrecargaReceta(
            prestacion,
            [registroMedicamento, registroInsumo, registroSinPrescripcion],
            REQMock
        );

        const controles = await RecetaControl.find({ idPrestacion: prestacion._id }).sort({ tipo: 1 });
        expect(controles).toHaveLength(3);

        const controlMedicamento: any = controles.find(c => c.tipo === 'medicamento');
        expect(controlMedicamento.identificador[0].valor).toBe(conceptos.medicamento);
        expect(controlMedicamento.cantTotalRecetas).toBe(2);
        expect(controlMedicamento.tratamientoProlongado).toBe(true);
        expect(controlMedicamento.estado).toBe('pendiente');
        expect(String(controlMedicamento.idPaciente)).toBe(String(prestacion.paciente.id));
        expect(controlMedicamento.createdBy.nombre).toBe('JUAN');

        const controlMagistral: any = controles.find(c => c.tipo === 'magistral');
        expect(controlMagistral.identificador[0].valor).toBe(conceptos.magistral);
        expect(controlMagistral.cantTotalRecetas).toBe(1);

        const controlInsumo: any = controles.find(c => c.tipo === 'dispositivo');
        expect(controlInsumo.identificador[0].valor).toBe(conceptos.dispositivo);
        expect(controlInsumo.cantTotalRecetas).toBe(1);
    });

    test('es idempotente: una segunda precarga no duplica controles', async () => {
        const prestacion = {
            _id: new Types.ObjectId(),
            paciente: { id: new Types.ObjectId(), documento: '30111222', sexo: 'femenino' }
        };
        const registro = crearRegistro({
            medicamentos: [medicamento(conceptos.medicamento)]
        });

        await generarPrecargaReceta(prestacion, [registro], REQMock);
        await generarPrecargaReceta(prestacion, [registro], REQMock);

        const controles = await RecetaControl.find({ idPrestacion: prestacion._id });
        expect(controles).toHaveLength(1);
    });
});

describe('job jobRecetaControl', () => {
    test('genera la receta faltante y marca el control como completo', async () => {
        const profesional = await crearProfesional();
        const registro = crearRegistro({
            medicamentos: [medicamento(conceptos.medicamento)]
        });
        const prestacion: any = await crearPrestacion([registro], profesional);
        const control = await crearControl(
            prestacion._id,
            registro._id,
            {
                idPaciente: prestacion.paciente.id,
                tipo: 'medicamento',
                nombre: 'Ibuprofeno',
                identificador: [{ fuente: 'snomed', valor: conceptos.medicamento }]
            }
        );

        await ejecutarJob();

        const recetas = await Receta.find({
            idPrestacion: String(prestacion._id),
            idRegistro: String(registro._id)
        });
        expect(recetas).toHaveLength(1);
        expect(recetas[0].medicamento.concepto.conceptId).toBe(conceptos.medicamento);

        const controlActualizado: any = await RecetaControl.findById(control._id);
        expect(controlActualizado.estado).toBe('completo');
        expect(controlActualizado.recetas).toHaveLength(1);
        expect(String(controlActualizado.recetas[0].id)).toBe(String(recetas[0]._id));
        expect(controlActualizado.ultimoError).toBeNull();
        expect(controlActualizado.intento).toBe(1);
    });

    test('genera la receta de insumo faltante y marca el control como completo', async () => {
        const profesional = await crearProfesional();
        const registro = crearRegistro({
            insumos: [insumo(conceptos.dispositivo)]
        }, '313047003');
        const prestacion: any = await crearPrestacion([registro], profesional);
        const control = await crearControl(
            prestacion._id,
            registro._id,
            {
                idPaciente: prestacion.paciente.id,
                tipo: 'dispositivo',
                nombre: 'Silla de ruedas',
                identificador: [{ fuente: 'sifaho', valor: conceptos.dispositivo }]
            }
        );

        await ejecutarJob();

        const recetas = await RecetaInsumo.find({
            idPrestacion: String(prestacion._id),
            idRegistro: String(registro._id)
        });
        expect(recetas).toHaveLength(1);
        expect(recetas[0].insumo.codigo[0].valor).toBe(conceptos.dispositivo);

        const controlActualizado: any = await RecetaControl.findById(control._id);
        expect(controlActualizado.estado).toBe('completo');
        expect(controlActualizado.recetas).toHaveLength(1);
        expect(controlActualizado.ultimoError).toBeNull();
    });

    test('si no encuentra la prescripción, deja el control en error tras el tercer intento', async () => {
        const profesional = await crearProfesional();
        const registro = crearRegistro({
            medicamentos: [medicamento(conceptos.medicamento)]
        });
        const prestacion: any = await crearPrestacion([registro], profesional);
        const control = await crearControl(
            prestacion._id,
            registro._id,
            {
                idPaciente: prestacion.paciente.id,
                tipo: 'medicamento',
                nombre: 'Medicamento inexistente',
                identificador: [{ fuente: 'snomed', valor: '999999999' }],
                intento: 2
            }
        );

        await ejecutarJob();

        const controlActualizado: any = await RecetaControl.findById(control._id);
        expect(controlActualizado.estado).toBe('error');
        expect(controlActualizado.intento).toBe(3);
        expect(controlActualizado.ultimoError.message).toContain('No se encontró el medicamento');
        expect(await Receta.countDocuments({})).toBe(0);
    });
});
