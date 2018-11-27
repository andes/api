// import {  model, Schema } from 'mongoose';

// // tslint:disable
// export let schema = new Schema({
//     nombre: {
//         type: String,
//         required: true
//     }
// });

// export let AreaLaboratorio = model('areaLaboratorio', schema, 'areaLaboratorio');
export let AreaLaboratorio = {
    nombre: {
        type: String,
        required: true
    }
};