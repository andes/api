import { model, Schema } from 'mongoose';

export let schema = new Schema({
    id: String,
    nombre: {
        type: String,
        required: true
    }
});
schema.plugin(require('../../../../mongoose/audit'));

export let AreaLaboratorio = model('areaLaboratorio', schema, 'areaLaboratorio');
