import {  model, Schema } from 'mongoose';

// // tslint:disable
// export let schema = new Schema({
//     nombre: {
//         type: String,
//         required: true
//     }
// });

// export let AreaLaboratorio = model('areaLaboratorio', schema, 'areaLaboratorio');
export let schema = new Schema({
    id: String,
    nombre: {
        type: String,
        required: true
    }
});
schema.plugin(require('../../../../mongoose/audit'));

export let AreaLaboratorio = model('areaLaboratorio', schema, 'areaLaboratorio');
