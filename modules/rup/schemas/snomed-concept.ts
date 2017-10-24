import { SemanticTag } from './semantic-tag';
export let SnomedConcept = {
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: SemanticTag,
    refsetIds: [String]
};
