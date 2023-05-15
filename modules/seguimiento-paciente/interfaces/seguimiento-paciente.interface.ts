import { Types } from 'mongoose';

export interface ISeguimientoPaciente {
    id?: Types.ObjectId | String;
    fechaInicio: Date;
    origen: {
        id: String;
        nombre: String;
        tipo: String;
    };
    score: {
        value: number;
        fecha: Date;
    };
    paciente: {
        id: String;
        nombre: String;
        alias?: String;
        apellido: String;
        documento: String;
        numeroIdentificaion?: String;
        telefonoActual: String;
        direccionActual: String;
        sexo: String;
        genero: String;
        foto: String;
        fechaNacimiento: Date;
    };
    llamados: any[];
    organizacionSeguimiento: {
        id: String;
        nombre: String;
        codigoSisa: String;
    };
    asignaciones?: [
        {
            profesional: {
                id: String;
                nombre: String;
                apellido: String;
                documento: String;
            };
            fecha: Date;
        }
    ];
    ultimaAsignacion?: {
        profesional: {
            id: String;
            nombre: String;
            apellido: String;
            documento: String;
        };
        fecha: Date;
    };
    ultimoEstado: {
        clave: String;
        valor: Date;
    };
    contactosEstrechos: any[];
    internacion?: boolean;
}
