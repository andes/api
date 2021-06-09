import { Schema } from 'mongoose';

export const contactoEstrechoSchema = new Schema(
    {
        apellido: String,
        nombre: String,
        documento: String,
        telefono: String,
        domicilio: String,
        fechaUltimoContacto: String,
        tipoContacto: Object
    });

