import { SemanticTag } from './semantic-tag';

export interface ISnomedConcept {
    conceptId: string;
    term: string;
    fsn: string;
    semanticTag: string;
}

export let SnomedConcept = {
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: SemanticTag
};
