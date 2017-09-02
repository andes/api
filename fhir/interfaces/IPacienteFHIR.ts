export interface PacienteFHIR {
    resourceType: String; // Patient
    identifier: [{assigner: String, value: String}],
    active: boolean; // Whether this patient's record is in active use
    name: [{
        resourceType: String, // HumanName
        family: String, // Family name (often called 'Surname')
        given: String[], // Given names (not always 'first'). Includes middle names
    }];
    gender: String; // male | female | other | unknown
    birthDate: Date;
    deceasedDateTime: Date;
    maritalStatus: String;
    photo: [{data: String}];
    telecom: [{
        resourceType: String, // ContactPoint
        value: String,
        rank: Number,
        system: String
    }];
    address: [{
        resourceType: String, // Address
        postalCode: String,
        line: [String],
        city: String,
        state: String,
        country: String,
    }];
    contact: [{
        relationship: [{
            text: String
        }], // The kind of relationship
        name: {
            resourceType: String, // HumanName
            family: String, // Family name (often called 'Surname')
            given: String[], // Given names (not always 'first'). Includes middle names
        }
    }];
}
