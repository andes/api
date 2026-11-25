import { Types } from 'mongoose';
import { setupUpMongo } from '@andes/unit-test';
import { Agenda } from '../schemas/agenda';
import { Prestacion } from '../../rup/schemas/prestacion';
import { populateIncluyePrestaciones, populatePrestaciones } from './agenda-prestaciones';

describe('populateIncluyePrestaciones', () => {
    it.each([
        ['prestaciones', true],
        ['prestaciones,notas', true],
        ['notas prestaciones', true],
        [['prestaciones'], true],
        ['', false],
        [undefined, false],
        [null, false],
        ['notas', false],
    ])('%p -> %p', (input, expected) => {
        expect(populateIncluyePrestaciones(input as any)).toBe(expected);
    });
});

setupUpMongo();

function crearAgenda(ids: { turnoAsignado: Types.ObjectId; turnoDisponible: Types.ObjectId; sobreturno: Types.ObjectId }) {
    return new Agenda({
        organizacion: { _id: new Types.ObjectId(), nombre: 'Organización Test' },
        tipoPrestaciones: [],
        horaInicio: new Date('2026-11-02T08:00:00Z'),
        horaFin: new Date('2026-11-02T12:00:00Z'),
        estado: 'publicada',
        bloques: [{
            horaInicio: new Date('2026-11-02T08:00:00Z'),
            horaFin: new Date('2026-11-02T12:00:00Z'),
            turnos: [
                { _id: ids.turnoAsignado, estado: 'asignado', horaInicio: new Date('2026-11-02T08:00:00Z') },
                { _id: ids.turnoDisponible, estado: 'disponible', horaInicio: new Date('2026-11-02T08:30:00Z') },
            ],
        }],
        sobreturnos: [
            { _id: ids.sobreturno, estado: 'asignado', horaInicio: new Date('2026-11-02T09:00:00Z') },
        ],
    });
}

async function insertarPrestacion(id: Types.ObjectId, idTurno: Types.ObjectId, estado: string, createdAt: Date) {
    await Prestacion.collection.insertMany([{
        _id: id,
        inicio: 'agenda',
        solicitud: {
            fecha: createdAt,
            turno: idTurno,
            tipoPrestacion: { conceptId: '123', term: 'Consulta' },
            registros: [{ concepto: { term: 'no debe viajar' } }],
        },
        estadoActual: { tipo: estado },
        ejecucion: { registros: [{ concepto: { term: 'no debe viajar' } }] },
        createdAt,
    }]);
}

describe('populatePrestaciones', () => {
    const ids = {
        turnoAsignado: new Types.ObjectId(),
        turnoDisponible: new Types.ObjectId(),
        sobreturno: new Types.ObjectId(),
    };

    beforeEach(async () => {
        await Prestacion.deleteMany({});
    });

    it('adjunta la prestación al turno asignado y al sobreturno, no al disponible', async () => {
        const idAsignado = new Types.ObjectId();
        const idSobreturno = new Types.ObjectId();
        await insertarPrestacion(idAsignado, ids.turnoAsignado, 'pendiente', new Date('2026-11-01T10:00:00Z'));
        await insertarPrestacion(idSobreturno, ids.sobreturno, 'validada', new Date('2026-11-01T11:00:00Z'));

        const [agenda] = await populatePrestaciones([crearAgenda(ids)]);

        expect(agenda.bloques[0].turnos[0].prestacion._id.toString()).toBe(idAsignado.toString());
        expect(agenda.bloques[0].turnos[0].prestacion.solicitud.tipoPrestacion.term).toBe('Consulta');
        expect(agenda.bloques[0].turnos[1].prestacion).toBeUndefined();
        expect(agenda.sobreturnos[0].prestacion._id.toString()).toBe(idSobreturno.toString());
    });

    it('no devuelve registros ni ejecución', async () => {
        await insertarPrestacion(new Types.ObjectId(), ids.turnoAsignado, 'pendiente', new Date('2026-11-01T10:00:00Z'));

        const [agenda] = await populatePrestaciones([crearAgenda(ids)]);

        expect(agenda.bloques[0].turnos[0].prestacion.solicitud.registros).toBeUndefined();
        expect(agenda.bloques[0].turnos[0].prestacion.ejecucion).toBeUndefined();
    });

    it('hace una sola consulta para todas las agendas', async () => {
        await insertarPrestacion(new Types.ObjectId(), ids.turnoAsignado, 'pendiente', new Date('2026-11-01T10:00:00Z'));
        const spy = jest.spyOn(Prestacion, 'find');

        await populatePrestaciones([crearAgenda(ids), crearAgenda(ids)]);

        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    it('prioriza la prestación no modificada más reciente', async () => {
        const idVieja = new Types.ObjectId();
        const idModificada = new Types.ObjectId();
        const idNueva = new Types.ObjectId();
        await insertarPrestacion(idVieja, ids.turnoAsignado, 'pendiente', new Date('2026-11-01T09:00:00Z'));
        await insertarPrestacion(idModificada, ids.turnoAsignado, 'modificada', new Date('2026-11-01T12:00:00Z'));
        await insertarPrestacion(idNueva, ids.turnoAsignado, 'ejecucion', new Date('2026-11-01T10:00:00Z'));

        const [agenda] = await populatePrestaciones([crearAgenda(ids)]);

        expect(agenda.bloques[0].turnos[0].prestacion._id.toString()).toBe(idNueva.toString());
    });

    it('si la consulta falla, devuelve las agendas sin prestación', async () => {
        const spy = jest.spyOn(Prestacion, 'find').mockImplementation(() => {
            throw new Error('boom');
        });

        const [agenda] = await populatePrestaciones([crearAgenda(ids)]);

        expect(agenda.bloques[0].turnos[0].prestacion).toBeUndefined();
        spy.mockRestore();
    });

    it('sin turnos asignados no consulta', async () => {
        const spy = jest.spyOn(Prestacion, 'find');
        const vacia = new Agenda({
            organizacion: { _id: new Types.ObjectId(), nombre: 'Organización Test' },
            tipoPrestaciones: [],
            horaInicio: new Date('2026-11-02T08:00:00Z'),
            horaFin: new Date('2026-11-02T09:00:00Z'),
            estado: 'publicada',
            bloques: [],
        });

        await populatePrestaciones([vacia]);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
