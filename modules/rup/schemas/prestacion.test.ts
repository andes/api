import { Prestacion } from './prestacion';

describe('PrestacionSchema condicionPaciente', () => {
    const solicitud = { fecha: new Date() };

    it('permite omitir la condición en prestaciones existentes o sin informar', () => {
        const prestacion = new Prestacion({ noNominalizada: false, solicitud });

        expect(prestacion.validateSync()?.errors.condicionPaciente).toBeUndefined();
    });

    it.each(['ambulatorio', 'internado', 'guardia'])('acepta la condición %s', condicionPaciente => {
        const prestacion = new Prestacion({
            noNominalizada: false,
            solicitud,
            condicionPaciente
        });

        expect(prestacion.validateSync()?.errors.condicionPaciente).toBeUndefined();
    });

    it('rechaza valores fuera del conjunto permitido', () => {
        const prestacion = new Prestacion({
            noNominalizada: false,
            solicitud,
            condicionPaciente: 'desconocido'
        });

        expect(prestacion.validateSync()?.errors.condicionPaciente).toBeDefined();
    });
});
