import { getFakeRequest } from '@andes/unit-test';
import { rup as rupConfig } from '../../config';
import { admitePrevalidacion, configPrevalidacion, deriveRolFirmante, formatearMatriculas, historialParaUpdateAtomico } from './controllers/prestacion';

/**
 * Tests de la derivación de rol del firmante (ADR 0001).
 * El rol NO se persiste en Profesional: se deriva de los permisos del usuario
 * al momento de firmar y se guarda como snapshot en la firma.
 */
describe('deriveRolFirmante', () => {
    const TIPO = '5a26e113291f463c1b982d98';

    function reqConPermisos(permisos: string[]) {
        const req: any = getFakeRequest();
        req.user.permisos = permisos;
        return req;
    }

    it('con permiso de validación sobre el tipo => validador (médico de planta)', () => {
        const req = reqConPermisos(['rup:validacion:' + TIPO]);
        expect(deriveRolFirmante(req, TIPO)).toBe('validador');
    });

    it('con wildcard de validación => validador', () => {
        const req = reqConPermisos(['rup:validacion:*']);
        expect(deriveRolFirmante(req, TIPO)).toBe('validador');
    });

    it('solo con permiso de pre-validación => prevalidador (residente)', () => {
        const req = reqConPermisos(['rup:prevalidacion:' + TIPO]);
        expect(deriveRolFirmante(req, TIPO)).toBe('prevalidador');
    });

    it('sin permisos relevantes => prevalidador', () => {
        const req = reqConPermisos(['mpi:paciente:*']);
        expect(deriveRolFirmante(req, TIPO)).toBe('prevalidador');
    });

    it('con ambos permisos gana validación (ADR: si valida, figura como validador)', () => {
        const req = reqConPermisos(['rup:validacion:' + TIPO, 'rup:prevalidacion:' + TIPO]);
        expect(deriveRolFirmante(req, TIPO)).toBe('validador');
    });

    it('permiso de validación de OTRO tipo no aplica a este tipo', () => {
        const req = reqConPermisos(['rup:validacion:otroTipoId']);
        expect(deriveRolFirmante(req, TIPO)).toBe('prevalidador');
    });
});

describe('admitePrevalidacion', () => {
    it('admite ejecución y pendiente de validación', () => {
        expect(admitePrevalidacion('ejecucion')).toBe(true);
        expect(admitePrevalidacion('pendienteValidacion')).toBe(true);
    });

    it('no admite otros estados', () => {
        expect(admitePrevalidacion('validada')).toBe(false);
        expect(admitePrevalidacion('pendiente')).toBe(false);
        expect(admitePrevalidacion('anulada')).toBe(false);
    });
});

describe('formatearMatriculas', () => {
    it('arma grado (MP) y posgrado (ME) con el formato del informe PDF', () => {
        const info = {
            formacionGrado: [{ nombre: 'Médico', numero: 1234 }],
            formacionPosgrado: [{ nombre: 'Cardiología', numero: 55 }]
        };
        expect(formatearMatriculas(info)).toBe('Médico MP 1234 - Cardiología ME 55');
    });

    it('sin matrículas vigentes => null', () => {
        expect(formatearMatriculas(null)).toBeNull();
        expect(formatearMatriculas({ formacionGrado: [], formacionPosgrado: [] })).toBeNull();
    });
});

describe('historialParaUpdateAtomico', () => {
    const usuario = { username: '30000000' };

    it('devuelve la última entrada de historial auditada en prestaciones top', () => {
        const prestacion = { inicio: 'top', solicitud: { historial: [{ accion: 'creacion' }, { accion: 'prevalidacion' }] } };
        const entrada: any = historialParaUpdateAtomico(prestacion, usuario);
        expect(entrada.accion).toBe('prevalidacion');
        expect(entrada.createdBy).toBe(usuario);
        expect(entrada.createdAt).toBeInstanceOf(Date);
    });

    it('fuera de top no corresponde historial => null', () => {
        const prestacion = { inicio: 'agenda', solicitud: { historial: [{ accion: 'prevalidacion' }] } };
        expect(historialParaUpdateAtomico(prestacion, usuario)).toBeNull();
    });
});

describe('configPrevalidacion', () => {
    it('expone el tope de firmas definido en config', () => {
        expect(configPrevalidacion()).toEqual({ maxFirmasPrevalidacion: rupConfig.maxFirmasPrevalidacion });
        expect(rupConfig.maxFirmasPrevalidacion).toBe(4);
    });
});
