const sinon = require('sinon');
import {Paciente} from './paciente';
import { assert } from 'chai';

describe('Paciente Schema', () => {
    it('Valida nombre del paciente si el paciente no posee nombre',  async () => {
        const paciente = new Paciente({
            apellido: 'andes', fechaNacimiento: Date.now(),
            sexo: 'femenino', genero: 'femenino', estado: 'temporal'
        });

        const error = await paciente.validateSync();
        assert.equal(error.errors['nombre'].message,
        'Path `nombre` is required.');
    });

    it('Valida apellido del paciente si el paciente no posee apellido',  async () => {
        const paciente = new Paciente({
            nombre: 'test', fechaNacimiento: Date.now(),
            sexo: 'femenino', genero: 'femenino', estado: 'temporal'
        });

        const error = await paciente.validateSync();
        assert.equal(error.errors['apellido'].message,
        'Path `apellido` is required.');
    });

    it('Valida fecha de nacmiento del paciente si el paciente no posee fecha de Nacimiento',  async () => {
        const paciente = new Paciente({
            nombre: 'test', apellido: 'andes',
            sexo: 'femenino', genero: 'femenino', estado: 'temporal'
        });

        const error = await paciente.validateSync();
        assert.equal(error.errors['fechaNacimiento'].message,
        'Path `fechaNacimiento` is required.');
    });

    it('Valida sexo del paciente si el paciente no posee sexo',  async () => {
        const paciente = new Paciente({
            nombre: 'test', apellido: 'andes',
            fechaNacimiento: Date.now(), genero: 'femenino', estado: 'temporal'
        });

        const error = await paciente.validateSync();
        assert.equal(error.errors['sexo'].message,
        'Path `sexo` is required.');
    });

    it('Valida género del paciente si el paciente no posee genero',  async () => {
        const paciente = new Paciente({
            nombre: 'test', apellido: 'andes', sexo: 'femenino',
            fechaNacimiento: Date.now(), estado: 'temporal'
        });

        const error = await paciente.validateSync();
        // console.log(error);
        assert.equal(error.name, 'ValidationError');
        assert.equal(error.errors['genero'].message,
        'Path `genero` is required.');
    });

    it('Valida estado del paciente si el paciente no posee estado',  async () => {
        const paciente = new Paciente({
            nombre: 'test', apellido: 'andes',  sexo: 'femenino', genero: 'femenino',
            fechaNacimiento: Date.now()
        });

        const error = await paciente.validateSync();
        // console.log(error);
        assert.equal(error.name, 'ValidationError');
        assert.equal(error.errors['estado'].message,
        'Path `estado` is required.');
    });


} );
