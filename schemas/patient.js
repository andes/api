"use strict";
var mongoose = require('mongoose');
var patientSchema = new mongoose.Schema({
    resourceType: String,
    id: String,
    identifier: [{
            use: String,
            system: String,
            value: String // Valor identiicador
        }],
    document: {
        system: String,
        value: String
    },
    active: Boolean,
    name: {
        text: String,
        family: [String],
        given: [String] // Nombres
    },
    telecom: [{
            system: String,
            value: String,
            use: String,
            rank: Number,
            period: {
                start: Date,
                end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
            }
        }],
    gender: String,
    birthDate: Date,
    deceasedDateTime: Date,
    address: [{
            use: String,
            type: String,
            text: String,
            line: [String],
            city: String,
            state: String,
            postalCode: String,
            country: String,
            latitude: String,
            longitude: String,
            period: {
                start: Date,
                end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
            }
        }],
    maritalStatus: {
        coding: [{
                system: String,
                code: String,
                display: String
            }]
    },
    photo: [{ String: String }],
    contact: [{
            relationship: [{
                    coding: [{
                            system: String,
                            code: String,
                            display: String
                        }]
                }],
            name: {
                text: String,
                family: [String],
                given: [String]
            },
            telecom: [{
                    system: String,
                    value: String,
                    use: String,
                    rank: Number,
                    period: {
                        start: Date,
                        end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
                    }
                }],
            address: {
                use: String,
                type: String,
                text: String,
                line: [String],
                city: String,
                state: String,
                postalCode: String,
                country: String,
                latitude: String,
                longitude: String,
                period: {
                    start: Date,
                    end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
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
    careProvider: [{}],
    managingOrganization: {}
});
//Creo un indice para fulltext Search
patientSchema.index({ '$**': 'text' });
var patient = mongoose.model('patient', patientSchema, 'patient');
module.exports = patient;
//# sourceMappingURL=patient.js.map