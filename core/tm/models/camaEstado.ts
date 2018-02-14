import * as express from 'express';
import { camaEstado } from '../schemas/camaEstado';
import { Auth } from '../../../auth/auth.class';

export function crear(estado, req) {

    return new Promise((resolve, reject) => {
        if (!estado) {
            return reject(new Error('Debe pasar el estado'));
        }

        let newCamaEstado = new camaEstado(estado);

        Auth.audit(newCamaEstado, req);

        newCamaEstado.save((err, data) => {
            if (err) {
                return reject(err);
            }

            return resolve(data);

        });
    });
}
