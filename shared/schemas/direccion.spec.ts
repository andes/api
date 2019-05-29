import * as sinon from 'sinon';
import { Direccion } from './direccion';
import { assert } from 'chai';

describe('Direccion Schema', () => {
    it('address is completed', async () => {
        const direccion = new Direccion({
            tipo: 'casa',
            valor: 'avenida siempre viva 134',
            ubicacion: {
                pais: {
                    nombre: 'Argentina'
                },
                localidad: {
                    nombre: 'Neuquen'
                },
                provincia: {
                    nombre: 'Neuquen'
                }
            },
            activo: true
        });

        const completed = direccion.isCompleted();
        assert.equal(completed, true);
    });

    it('address is not completed', async () => {
        const direccion = new Direccion({
            tipo: 'casa',
            valor: 'avenida siempre viva 134',
            ubicacion: {
                pais: {
                    nombre: 'Argentina'
                },
                localidad: {
                    nombre: 'Neuquen'
                }
            },
            activo: true
        });

        const completed = direccion.isCompleted();
        assert.equal(completed, false);
    });

    it('address is not completed', async () => {
        const direccion = new Direccion({
            tipo: 'casa',
            ubicacion: {
                pais: {
                    nombre: 'Argentina'
                },
                localidad: {
                    nombre: 'Neuquen'
                },
                provincia: {
                    nombre: 'Neuquen'
                }
            },
            activo: true
        });

        const completed = direccion.isCompleted();
        assert.equal(completed, false);
    });

    it('format address', async () => {
        const direccion = new Direccion({
            tipo: 'casa',
            valor: 'avenida siempre viva 134',
            ubicacion: {
                pais: {
                    nombre: 'Argentina'
                },
                localidad: {
                    nombre: 'Neuquen'
                },
                provincia: {
                    nombre: 'Neuquen'
                }
            },
            activo: true
        });

        const address = direccion.format();
        assert.equal(address, 'avenida siempre viva 134, Neuquen, Neuquen');
    });
});
