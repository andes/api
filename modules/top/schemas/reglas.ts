import * as mongoose from 'mongoose';

let reglasSchema = new mongoose.Schema({
    origen: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        tipoPrestacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId }
        }
    },
    destino: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        tipoPrestacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId }
        },
        profesionales: [
            {
                id: { type: mongoose.Schema.Types.ObjectId },
                nombre: String,
                apellido: String
            }
        ]
    },
    auditable: Boolean,
});

let model = mongoose.model('reglas', reglasSchema, 'reglas');
export = model;
