import * as mongoose from 'mongoose';

var practitionerSchema = new mongoose.Schema({
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
    active: {
        type: Boolean,
        required: true
    },
    name: {
        text: String, //FullName Generation
        given: [String],
        family: [String]
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
        use: String, // home | work | temp
        type: String, // postal | physical | both
        text: String, // Text representation of the address
        line: [String], // Street name, number, direction & P.O. Box etc.
        city: String, // Ciudad
        state: String, // Provincia
        postalCode: String, // Postal code for area
        country: String, // Country (can be ISO 3166 3 letter code)
        latitude: String, //"latitud",
        longitude: String, //"longitud",
        period: {
            start: Date, // C? Starting time with inclusive boundary
            end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
        }
    },
    gender: String, //male | female | Undifferentiated Debe existir una colección con los posibles valores
    birthDate: Date, // Fecha Nacimiento
    photo: [{ String }],
    practitionerRole : [{ // Roles/organizations the practitioner is associated with
        managingOrganization : String, // Organization where the roles are performed
        role : [{ String }], // Roles which this practitioner may perform
        specialty : [{ String }], // Specific specialty of the practitioner
        period: { // The period during which the practitioner is authorized to perform in these role(s)
            start: Date, 
            end: Date 
        },
        validity: Boolean, // Indica si la matricula está vigente
        location : [{ String }], // The location(s) at which this practitioner provides care
        healthcareService : [{ String }] // The list of healthcare services that this worker provides for this role's Organization/Location(s)
     }],
    qualification: [{ // Qualifications obtained by training and certification [MATRICULAS!!]
        identifier: String, // An identifier for this qualification for the practitioner
        code: String, // R!  Coded representation of the qualification
        period: { // Period during which the qualification is valid
            start: Date, 
            end: Date 
        }, 
        issuer: String // Organization that regulates and issues the qualification
    }],
    communication: [{String}] // A language the practitioner is able to use in patient communication 
})

var practitioner = mongoose.model('practitioner', practitionerSchema, 'practitioner');

export = practitioner;