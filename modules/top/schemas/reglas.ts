import * as mongoose from 'mongoose';

let reglasSchema = new mongoose.Schema({
    origen: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestaciones: [{
            term: String,
            conceptId: String,
            auditable: Boolean
        }],
    },
    destino: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestacion: {
            term: String,
            conceptId: String
        },
        profesionales: [
            {
                id: { type: mongoose.Schema.Types.ObjectId },
                nombre: String,
                apellido: String
            }
        ]
    }
});

let model = mongoose.model('reglas', reglasSchema, 'reglas');
export = model;
