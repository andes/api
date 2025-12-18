import { Document, model, Schema, SchemaTypes, Types } from 'mongoose';

export interface IPantalla extends Document {
    nombre: String;
    tipo: String;
    token: String;
    organizacion: Types.ObjectId;
    expirationTime: Date;
    espaciosFisicos: {
        type: {
            id: Types.ObjectId;
            nombre: String;
        };
    };
    playlist?: String;
    bloqueada: Boolean;
}

export const TurneroPantallaSchema = new Schema({
    nombre: String,
    tipo: String,
    token: { type: String, required: false },
    organizacion: SchemaTypes.ObjectId,
    expirationTime: Date,
    espaciosFisicos: [{
        _id: false,
        id: SchemaTypes.ObjectId,
        nombre: String
    }],
    playlist: { type: String, required: false },
    bloqueada: Boolean
});

export const TurneroPantalla = model<IPantalla>('turneroPantallas', TurneroPantallaSchema, 'turneroPantallas');
