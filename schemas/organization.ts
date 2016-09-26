import * as mongoose from 'mongoose';

var organizationSchema = new mongoose.Schema({
    resourceType: String,
    id: String,
    identifier: [{ // Guardar los distintos códigos de establecimiento
        use: String, // puede ser usual | official | temp | secondary
        system: String, // URI
        value: String // Valor identiicador
    }],
    active: Boolean,
    type : {
        coding: [{
           system: String,
           code: String,
           display: String
       }]
    },
    name : String,
    // descripcion: String,
    telecom: [{
        system: String, // limitado a phone | email solo dejo que sea telefono o email
        value: String, // El numero de telefono formato 999-15 9999999
        use: String, // work | temp | mobile - The telecom of an organization can never be of use 'home'
        rank: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)
        period: {
            start: Date, // C? Starting time with inclusive boundary
            end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
        }
    }],
    address: [{
        // use : String, // home | work | temp
        // name : String,
        // type : String, // postal | physical | both
        // text : String, // Text representation of the address
        // line : [String], // Street name, number, direction & P.O. Box etc.
        // city : String, // Ciudad
        // state : String, // Provincia
        // postalCode : String, // Postal code for area
        // country : String, // Country (can be ISO 3166 3 letter code)
        // latitude : String, //"latitud",
        // longitude : String,  //"longitud",
        // period : {
        //     start : Date, // C? Starting time with inclusive boundary
        //     end : Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
        // }
    }],
    //Contact for the organization for a certain purpose.
    contact: [{
        purpose: {
            coding: [{
                system: String,
                code: String
            }]
        },
        name: {
           family: [String],
           given: [String]
        },
        telecom: [{
            system: String, // limitado a phone | email solo dejo que sea telefono o email
                value: String, // El numero de telefono formato 999-15 9999999
                use: String, // home | work | temp | mobile - purpose of this contact point
                rank: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)
                period: {
                    start: Date, // C? Starting time with inclusive boundary
                    end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
                }
        }],
        address: {
            // use : String, // home | work | temp
            // type : String, // postal | physical | both
            // text : String, // Text representation of the address
            // line : [String], // Street name, number, direction & P.O. Box etc.
            // city : String, // Ciudad
            // state : String, // Provincia
            // postalCode : String, // Postal code for area
            // country : String, // Country (can be ISO 3166 3 letter code)
            // latitude : String, //"latitud",
            // longitude : String,  //"longitud",
            // period : {
            //     start : Date, // C? Starting time with inclusive boundary
            //     end : Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
            // }
         }
    }],

    nivelComplejidad: Number,
    fechaAlta: Date,
    fechaBaja: Date
    //En lugar de tipoEstablecimiento usaríamos type
    // tipoEstablecimiento : {
    //     nombre: String,
    //     descripcion: String,
    //     clasificacion: String

    // },
    
    //Verificar si está bien ponerlos en identifier
    // codigo:{
    //     sisa: {
    //         type: Number,
    //         required: true
    //     },
    //     cuie: String,
    //     remediar: String
    // },

});

var organization = mongoose.model('organization', organizationSchema, 'organization');

export = organization;
