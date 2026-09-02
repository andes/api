/**
 * Declaraciones de tipos para @andes/fhir.
 * Evita que TypeScript compile directamente los fuentes TS
 * publicados dentro del paquete.
 */
declare module '@andes/fhir' {
    export const Organization: any;
    export const Practitioner: any;
    export const Patient: any;
    export const initialize: any;

    const _default: any;
    export default _default;
}
