import * as mongoose from 'mongoose';
import { Connections } from './../../../connections';
import * as configPrivate from './../../../config.private';

export let TextIndexSchema = new mongoose.Schema({
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: String,
    refsetIds: [String]
});

// Se asegura que los índices estén creados
TextIndexSchema.index({ descriptionId: 1});
TextIndexSchema.index({ term: 'text'});
TextIndexSchema.index({ term: 1});
TextIndexSchema.index({ words: 1});

// textIndexSchema.index({ words: 1, semanticTag: 1, languageCode: 1, conceptActive: 1, active: 1 });
// textIndexSchema.index({ conceptId: 1, semanticTag: 1, languageCode: 1, conceptActive: 1, active: 1 });
// textIndexSchema.index({ refsetIds: 1, semanticTag: 1, languageCode: 1, conceptActive: 1, active: 1 });

export let TextIndexModel = Connections.snomed.model(configPrivate.snomed.dbName + 'tx', TextIndexSchema, configPrivate.snomed.dbVersion + 'tx');


export let SnomedSchema = new mongoose.Schema({
    conceptId: String,
    semtag: String,
    preferredTerm: String,
    fullySpecifiedName: String,
    isLeafInferred: Boolean,
    isLeafStated: Boolean,
    active: Boolean,
    memberships: [{
        _id: false,
        refset: {
            conceptId: String,
            preferredTerm: String
        }
    }],
    relationships: [{
        _id: false,
        active: Boolean,
        type: {type: {
            conceptId: String,
            preferredTerm: String
        }},
        destination: {
            conceptId: String,
            fullySpecifiedName: String,
            preferredTerm: String,
            active: Boolean,
        },
        characteristicType: {
            conceptId: String,
            preferredTerm: String
        }
    }],
    descriptions: [{
        conceptId: String,
        term: String,
        languageCode: String,
        active: Boolean
    }]
});

SnomedSchema.index({conceptId : 1});
SnomedSchema.index({'relationships.destination.conceptId' : 1, 'relationships.type.conceptId' : 1});
SnomedSchema.index({'relationships.type.conceptId' : 1, 'relationships.destination.conceptId' : 1});
SnomedSchema.index({inferredAncestors : 1});
SnomedSchema.index({statedAncestors : 1});
SnomedSchema.index({'memberships.refset.conceptId': 1});


export let SnomedModel = Connections.snomed.model(configPrivate.snomed.dbName, SnomedSchema, configPrivate.snomed.dbVersion);
