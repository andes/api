import * as mongoose from 'mongoose';

export const nomivacLaboratorioSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    Pais: String,
    RazonSocial: String,
    CUIT: String,
    Provincia: String,
    Localidad: String,
    Domicilio: String,
    CodigoPostal: String,
    TipoTelefono: String,
    Telefono: String,
    Mail: String,
    habilitado: Boolean
});

export const nomivacLaboratorio = mongoose.model('nomivacLaboratorios', nomivacLaboratorioSchema, 'nomivacLaboratorios');
