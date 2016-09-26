"use strict";
var mongoose = require('mongoose');
var organizationSchema = new mongoose.Schema({
    resourceType: String,
    id: String,
    identifier: [{
            use: String,
            system: String,
            value: String // Valor identiicador
        }],
    active: Boolean,
    type: {
        coding: [{
                system: String,
                code: String,
                display: String
            }]
    },
    name: String,
    // descripcion: String,
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
    address: [{}],
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
                    system: String,
                    value: String,
                    use: String,
                    rank: Number,
                    period: {
                        start: Date,
                        end: Date // C? End time with inclusive boundary, if not ongoing} // Time period when the contact point was/is in use
                    }
                }],
            address: {}
        }],
    nivelComplejidad: Number,
    fechaAlta: Date,
    fechaBaja: Date
});
var organization = mongoose.model('organization', organizationSchema, 'organization');
module.exports = organization;
//# sourceMappingURL=organization.js.map