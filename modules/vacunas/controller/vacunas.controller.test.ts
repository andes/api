import { vacunas } from '../schemas/vacunas';
import { getVacunas } from './vacunas.controller';
import { getVacunas as getVacunasMobile } from '../../mobileApp/controller/VacunasController';

const DOCUMENTO = '12345678';

const paciente: any = {
    documento: DOCUMENTO,
    nombre: 'Maria',
    apellido: 'Perez',
    sexo: 'femenino',
    fechaNacimiento: new Date('1990-05-10T12:00:00Z')
};

const vacunaDelPaciente = (idvacuna: number) => new vacunas({
    idvacuna,
    documento: DOCUMENTO,
    nombre: 'Maria',
    apellido: 'Perez',
    sexo: 'femenino',
    fechaNacimiento: new Date('1990-05-10T12:00:00Z')
});

// Otra persona que tiene el mismo número de documento
const vacunaDeOtraPersona = (idvacuna: number) => new vacunas({
    idvacuna,
    documento: DOCUMENTO,
    nombre: 'Juan',
    apellido: 'Gomez',
    sexo: 'masculino',
    fechaNacimiento: new Date('1985-01-01T12:00:00Z')
});

function mockVacunas(docs: any[]) {
    jest.spyOn(vacunas, 'find').mockReturnValue({ sort: () => Promise.resolve(docs) } as any);
}

// Se serializa igual que al responder el request
const toJSON = (resultado: any) => JSON.parse(JSON.stringify(resultado));

// Las dos implementaciones (módulo vacunas y app mobile) deben comportarse igual
const implementaciones: [string, (pacienteMPI: any) => Promise<any>][] = [
    ['vacunas', getVacunas],
    ['mobileApp', getVacunasMobile]
];

describe.each(implementaciones)('Vacunas - getVacunas (%s)', (_nombre, getVacunasFn) => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('devuelve las vacunas del paciente sin sus datos personales', async () => {
        mockVacunas([vacunaDelPaciente(1), vacunaDelPaciente(2)]);

        const resultado = toJSON(await getVacunasFn(paciente));

        expect(resultado.map(v => v.idvacuna)).toEqual([1, 2]);
        resultado.forEach(v => {
            expect(v.nombre).toBeUndefined();
            expect(v.apellido).toBeUndefined();
            expect(v.documento).toBeUndefined();
            expect(v.sexo).toBeUndefined();
            expect(v.fechaNacimiento).toBeUndefined();
        });
    });

    test('descarta la vacuna de otra persona con el mismo documento', async () => {
        mockVacunas([vacunaDelPaciente(1), vacunaDeOtraPersona(2)]);

        const resultado = toJSON(await getVacunasFn(paciente));

        expect(resultado.map(v => v.idvacuna)).toEqual([1]);
    });

    test('descarta todas las vacunas de otra persona cuando son más de una', async () => {
        mockVacunas([vacunaDeOtraPersona(1), vacunaDeOtraPersona(2), vacunaDelPaciente(3)]);

        const resultado = toJSON(await getVacunasFn(paciente));

        expect(resultado.map(v => v.idvacuna)).toEqual([3]);
        expect(JSON.stringify(resultado)).not.toContain('Juan');
        expect(JSON.stringify(resultado)).not.toContain('Gomez');
    });

    test('mantiene las vacunas del paciente y su orden cuando están intercaladas con las de otra persona', async () => {
        mockVacunas([
            vacunaDeOtraPersona(1),
            vacunaDeOtraPersona(2),
            vacunaDelPaciente(3),
            vacunaDeOtraPersona(4),
            vacunaDeOtraPersona(5),
            vacunaDelPaciente(6)
        ]);

        const resultado = toJSON(await getVacunasFn(paciente));

        expect(resultado.map(v => v.idvacuna)).toEqual([3, 6]);
    });

    test('sin vacunas devuelve una lista vacía', async () => {
        mockVacunas([]);

        const resultado = toJSON(await getVacunasFn(paciente));

        expect(resultado).toEqual([]);
    });
});
