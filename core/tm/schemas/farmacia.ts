import * as mongoose from 'mongoose';
import { CustomError } from '@andes/core';
import * as direccionSchema from './direccion';
import { IFarmacia } from '../interfaces/IFarmacia';
import { AndesDocWithAudit } from '@andes/mongoose-plugin-audit';


const FarmaciaSchema = new mongoose.Schema({
    denominacion: String,
    razonSocial: String,
    cuit: {
        type: String,
        maxlength: 11
    },
    DTResponsable: String,
    matriculaDTResponsable: String,
    disposicionAltaDT: String,
    activo: Boolean,
    farmaceuticosAuxiliares: [],
    horarios: [],
    domicilio: { type: direccionSchema },
    contactos: [],
    asociadoA: {
        type: String,
        enum: ['Colegio de Farmacéuticos', 'Farmacias Sociales', 'Camara de Farmacéuticos', 'Independientes']
    },
    disposicionHabilitacion: String,
    fechaHabilitacion: Date,
    fechaRenovacion: Date,
    vencimientoHabilitacion: Date,
    gabineteInyenctables: Boolean,
    laboratoriosMagistrales: Boolean,
    expedientePapel: String,
    expedienteGDE: String,
    nroCaja: String,
    tipoEstablecimiento: {
        type: String,
        enum: ['Farmacia', 'Droguería', 'Botiquín', 'Depósito', 'Distribuidora', 'Vacunatorio', 'Esterilización']
    },
    disposiciones: [{
        numero: String,
        descripcion: String
    }],
    sancion: [{
        numero: String,
        descripcion: String
    }]
});

FarmaciaSchema.pre('save', function (this: any, next) {
    if (this.cuit) {
        const cuit = this.cuit.replace(/\D/g, '');
        if (!cuit || cuit.length > 11) {
            return next(new CustomError('CUIT inválido. Debe tener 11 dígitos numéricos con dígito verificador correcto.', 400));
        }
        this.cuit = cuit;
    }
    next();
});


export type IFarmaciaDoc = AndesDocWithAudit<IFarmacia>;
export const Farmacia = mongoose.model<IFarmaciaDoc>('farmacias', FarmaciaSchema, 'farmacias');
