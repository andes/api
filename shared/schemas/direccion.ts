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
    return !!this.valor && this.valor.length > 0 && !!this.ubicacion.localidad && !!this.ubicacion.provincia;
};

DireccionSchema.methods.format = function () {
    let address = '';
    if (this.valor && this.valor.length > 0) {
        address += this.valor;
    }
    if (this.ubicacion.localidad) {
        address += `, ${this.ubicacion.localidad.nombre}`;
    }
    if (this.ubicacion.provincia) {
        address += `, ${this.ubicacion.provincia.nombre}`;
    }
    return address;
};

export const Direccion = mongoose.model<IDireccionDoc>('direccion', DireccionSchema);
