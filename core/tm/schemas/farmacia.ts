import * as mongoose from 'mongoose';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import { IFarmacia } from '../interfaces/IFarmacia';
import { AndesDocWithAudit } from '@andes/mongoose-plugin-audit';

const FarmaciaSchema = new mongoose.Schema({
    denominacion: String,
    razonSocial: String,
    cuit: String,
    DTResponsable: String,
    matriculaDTResponsable: String,
    disposicionAltaDT: String,
    farmaceuticosAuxiliares: [],
    horarios: [],
    domicilio: { type: direccionSchema },
    contactos: [contactoSchema],
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
    disposiciones: [{
        numero: String,
        descripcion: String
    }],
    sancion: [{
        numero: String,
        descripcion: String
    }]
});

export type IFarmaciaDoc = AndesDocWithAudit<IFarmacia>;
export const Farmacia = mongoose.model<IFarmaciaDoc>('farmacias', FarmaciaSchema, 'farmacias');
