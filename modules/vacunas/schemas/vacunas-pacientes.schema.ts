import { model, Schema, SchemaTypes } from 'mongoose';
import { ESTADO, NombreSchemaV2 } from '../../../shared/schemas';

export const VacunasPacientesSchema = new Schema({
    paciente: {
        id: SchemaTypes.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        fechaNacimiento: Date,
        fechaFallecimiento: Date,
        estado: ESTADO,
        sexo: String,
        telefono: String,
        email: String,
        localidad: NombreSchemaV2,
        zona: NombreSchemaV2,
        areaPrograma: NombreSchemaV2
    },
    aplicaciones: [{
        idPrestacion: SchemaTypes.ObjectId,
        edad: Number,
        rango: String,
        fechaAplicacion: Date,
        vacuna: {
            id: SchemaTypes.ObjectId,
            nombre: String,
            codigo: String,
        },
        dosis: {
            orden: Number,
            nombre: String,
            codigo: String,
        },
        esquema: {
            nombre: String,
            codigo: String,
        },
        condicion: {
            nombre: String,
            codigo: String,
        },
        lote: String,
        enDomicilio: Boolean,
        organizacion: {
            id: SchemaTypes.ObjectId,
            nombre: String,
            localidad: {
                id: SchemaTypes.ObjectId,
                nombre: String,
            },
            zona: {
                id: SchemaTypes.ObjectId,
                nombre: String,
            },
            areaPrograma: {
                id: SchemaTypes.ObjectId,
                nombre: String,
            }
        }
    }],
    cantDosis: Number,
    inscripto: Boolean

});

export const VacunasPacientes = model('pacientes-vacunas', VacunasPacientesSchema, 'pacientes-vacunas');
