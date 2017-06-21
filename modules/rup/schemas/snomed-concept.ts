export let SnomedConcept = {
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: {
        type: String,
        enum: ['hallazgo', 'trastorno', 'antecedenteFamiliar', 'procedimiento']
    }
};
