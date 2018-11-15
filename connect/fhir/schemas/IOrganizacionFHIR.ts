export interface OrganizacionFHIR {
    resourceType: String; // Organización
    identifier: [{ assigner: String, value: String }]; // Identifies this organization across multiple systems
    active: boolean; // Whether the organization's record is still in active use
    type: { // 	Kind of organization
        text: String; // Healthcare Provider | Hospital Department | Organizational team | Government | Educational Institute | Other
    };
    name: String; // Name used for the organization
    telecom: [{
        resourceType: String; // ContactPoint
        value: String;
        rank: Number;
        use: String;
        system: String // phone | email
    }];
    address: [{ // An address for the organization
        resourceType: String; // Address
        postalCode: String;
        line: [String];
        city: String;
        state: String;
        country: String;
    }];
}
