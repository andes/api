import { ISnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

export interface ISectores {
    tipoSector: ISnomedConcept;
    unidadConcept?: ISnomedConcept;
    nombre: String;
    hijos?: ISectores[];
}
