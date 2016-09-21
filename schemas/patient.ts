import * as mongoose from 'mongoose';

var patientSchema = new mongoose.Schema({
    resourceType: String,
    id: String,
    identifier: [{ // Guardar las instancias de los numeros de historias clinicas de los distintos efectores
        use: String, // puede ser usual | official | temp | secondary ----> En ANDES deberian ser oficiales
        system: String, // URI ????
        value: String // Valor identiicador
    }],
    document: { // DU
        system: String,
        value: String
    },
    active: Boolean,
    name: {
        family: [String], // Apellidos
        given: [String] // Nombres
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
    gender: String, //male | female | Undifferentiated Debe existir una colección con los posibles valores
    birthDate: Date, // Fecha Nacimiento
    deceasedDateTime: Date,
    address: [{
        use : String, // home | work | temp
        type : String, // postal | physical | both
        text : String, // Text representation of the address
        line : [String], // Street name, number, direction & P.O. Box etc.
        city : String, // Ciudad
        state : String, // Provincia
        postalCode : String, // Postal code for area
        country : String, // Country (can be ISO 3166 3 letter code)
        latitude : String, //"latitud",
        longitude : String,  //"longitud",
        period : {
            start : Date, // C? Starting time with inclusive boundary
            end : Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
        }
   }],
   maritalStatus: {
       coding: [{
           system: String,
           code: String,
           display: String
       }]
   },
   photo: [{String}],
   contact: [{
       relationship: [{
           coding: [{
               system: String,
               code: String,
               display: String
           }]
       }],
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
            use : String, // home | work | temp
            type : String, // postal | physical | both
            text : String, // Text representation of the address
            line : [String], // Street name, number, direction & P.O. Box etc.
            city : String, // Ciudad
            state : String, // Provincia
            postalCode : String, // Postal code for area
            country : String, // Country (can be ISO 3166 3 letter code)
            latitude : String, //"latitud",
            longitude : String,  //"longitud",
            period : {
                start : Date, // C? Starting time with inclusive boundary
                end : Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
            }
       },
       gender: String
       }],

    communication: [{
          language: {
                   coding: [{
                   system: String,
                   code: String,
                   display: String
               }]
           },
           preferred: Boolean,
       }],
    careProvider : [{ //Referencia a una obrasocial) }], // Patient's nominated primary care provid
       }],
    managingOrganization: {//referencia a un efector
        }
    });



var patient = mongoose.model('patient', patientSchema, 'patient');
export = patient;
