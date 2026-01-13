/**
 * Mock manual de mongoose-gridfs
 * Necesario para evitar carga ESM (@lykmapipo/*) en Jest (Node >=16)
 */
declare module '@andes/fhir' {
    export const Organization: any;
    export const Practitioner: any;
    export const Patient: any;
    export const initialize: any;

    const _default: any;
    export default _default;
}
