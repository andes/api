import { getFakeRequest } from '@andes/unit-test';
import { deriveRolFirmante } from './controllers/prestacion';

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
