import { Schema } from 'mongoose';

export const contactoEstrechoSchema = new Schema(
    {
        apellidoNombre: String,
        dni: String,
        telefono: String,
        domicilio: String,
        fechaUltimoContacto: String,
        tipoContacto: Object
    });

