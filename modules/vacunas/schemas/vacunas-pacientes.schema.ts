import { model, Schema, SchemaTypes } from 'mongoose';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

export const VacunasPacientesSchema = new Schema({
    paciente: PacienteSubSchema,
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
