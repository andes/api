import * as mongoose from 'mongoose';
import { UbicacionSchema } from './ubicacion';
import { IDireccionDoc } from '../interfaces/direccion.interface';

export const DireccionSchema = new mongoose.Schema({
    tipo: {
        type: String,
        required: false
    },
    valor: String,
    codigoPostal: String,
    ubicacion: { type: UbicacionSchema },
    geoReferencia: {
        // [TODO] Cambiar a objeto { lat: , lng: }
        // Orden de las coordenadas [lat, lng]
        type: [Number]
    },
    ranking: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    ultimaActualizacion: Date,
    situacionCalle: Boolean
});

DireccionSchema.methods.isCompleted = function () {
    const doc = this as IDireccionDoc;
    return !!doc.valor && doc.valor.length > 0 && !!doc.ubicacion.localidad && !!doc.ubicacion.provincia;
};

DireccionSchema.methods.format = function () {
    let address = '';
    const doc = this as IDireccionDoc;
    if (doc.valor && doc.valor.length > 0) {
        address += doc.valor;
    }
    if (doc.ubicacion.localidad) {
        address += `, ${doc.ubicacion.localidad.nombre}`;
    }
    if (doc.ubicacion.provincia) {
        address += `, ${doc.ubicacion.provincia.nombre}`;
    }
    return address;
};

export const Direccion = mongoose.model<IDireccionDoc>('direccion', DireccionSchema);
