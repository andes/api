export function populateIncluyePrestaciones(populate: any): boolean {
    if (!populate) {
        return false;
    }
    const valores = Array.isArray(populate) ? populate : String(populate).split(/[,\s]+/);
    return valores.map((valor) => String(valor).trim()).includes('prestaciones');
}
