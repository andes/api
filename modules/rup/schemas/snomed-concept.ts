export let SnomedConcept = {
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: {
        type: String,
        enum: ['procedimiento', 'solicitud', 'hallazgo', 'trastorno', 'antecedenteFamiliar', 'entidad observable']
    }
};
