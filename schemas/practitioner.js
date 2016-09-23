"use strict";
var mongoose = require('mongoose');
var practitionerSchema = new mongoose.Schema({
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
    active: {
        type: Boolean,
        required: true
    },
    name: {
        text: String,
        given: [String],
        family: [String]
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
    gender: String,
    birthDate: Date,
    photo: [{ String: String }],
    practitionerRole: [{
            managingOrganization: String,
            role: [{ String: String }],
            specialty: [{ String: String }],
            period: {
                start: Date,
                end: Date
            },
            validity: Boolean,
            location: [{ String: String }],
            healthcareService: [{ String: String }] // The list of healthcare services that this worker provides for this role's Organization/Location(s)
        }],
    qualification: [{
            identifier: String,
            code: String,
            period: {
                start: Date,
                end: Date
            },
            issuer: String // Organization that regulates and issues the qualification
        }],
    communication: [{ String: String }] // A language the practitioner is able to use in patient communication 
});
var practitioner = mongoose.model('practitioner', practitionerSchema, 'practitioner');
module.exports = practitioner;
//# sourceMappingURL=practitioner.js.map