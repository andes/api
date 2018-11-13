export interface ProfesionalFHIR {
    resourceType: String; // Practitioner
    identifier: [{
        system: String,
        value: String
    }];
    active: boolean; // Whether this practitioner's record is in active use
    name: [{
        resourceType: String; // HumanName
        family: String[]; // Family name (often called 'Surname')
        given: String[]; // Given names (not always 'first'). Includes middle names
    }];
    telecom: [{
        resourceType: String; // ContactPoint
        value: String;
        rank: Number;
        use: String;
        system: String // phone | email
    }];
    address: [{
        resourceType: String; // Address
        postalCode: String;
        line: [String];
        city: String;
        state: String;
        country: String;
    }];
    gender: String; // male | female | other | unknown
    birthDate: Date; // The date on which the practitioner was born
    photo: [{ data: String }];
}
