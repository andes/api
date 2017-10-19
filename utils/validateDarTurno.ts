import * as express from 'express';
import { paciente } from '../core/mpi/schemas/paciente';

export class ValidateDarTurno {

    /**
     * Al momento de dar un turno, chequea que no falte ningun dato necesario
     * antes de modificar la agenda
     * @static
     * @param {Any} data debe contener info de paciente, idBloque y tipoPrestacion
     * @returns {Any} Objeto que contiene un valor booleano 'valid' y un array con los errores
     *
     * @memberOf ValidateDarTurno
     */
    public static checkTurno(data: any): any {
        let errors = [];
        let valid = true;

        if (!data.tipoPrestacion) {
            valid = false;
            errors.push('Falta el tipo de prestación');
        }

        if (!data.paciente.apellido) {
            valid = false;
            errors.push('Paciente no posee apellido');
        }

        if (!data.paciente.nombre) {
            valid = false;
            errors.push('Paciente no posee nombre');
        }

        if (!data.paciente.id) {
            valid = false;
            errors.push('Paciente no posee ID');
        }

        return {
            valid: valid,
            errors: errors
        };
    }

}
