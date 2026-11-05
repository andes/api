export type FuenteCodigo = 'snomed' | 'sifaho';

export interface CodigoPrescripcion {
    fuente: FuenteCodigo;
    valor: string;
}

export function normalizarCodigos(codigos: CodigoPrescripcion[] = []): CodigoPrescripcion[] {
    return codigos.map(codigo => ({
        fuente: codigo.fuente.toLowerCase() as FuenteCodigo,
        valor: String(codigo.valor)
    }));
}

export function getDatosPrescripcion(prescripcion) {
    let tipo: string, nombre: string, identificador: CodigoPrescripcion[] = [];

    if (prescripcion?.esMagistral) {
        tipo = 'magistral';
        identificador = prescripcion.magistral?.codigo || [];
        nombre = prescripcion.magistral?.nombre;

    } else {
        const esInsumo = ['dispositivo', 'nutricion'].includes(prescripcion?.generico?.tipo) || ['dispositivo', 'nutricion'].includes(prescripcion?.tipo);
        if (esInsumo) {
            tipo = prescripcion.generico?.tipo || prescripcion.tipo;
            identificador = prescripcion.generico?.codigo || prescripcion.codigo || [];
            nombre = prescripcion.generico?.nombre || prescripcion.nombre;

        } else {
            tipo = 'medicamento';
            const conceptId = prescripcion?.generico?.conceptId || prescripcion?.concepto?.conceptId;
            identificador = conceptId ? [{ fuente: 'snomed', valor: String(conceptId) }] : [];
            nombre = prescripcion?.generico?.term || prescripcion?.concepto?.term;

        }
    }
    // se eliminan ids de algunos códigos y se aplica el formato canónico
    identificador = normalizarCodigos(identificador);
    return { tipo, nombre, identificador };
}

export function matchIdentificador(idA: CodigoPrescripcion[] = [], idB: CodigoPrescripcion[] = []): boolean {
    const codigosA = normalizarCodigos(idA);
    const codigosB = normalizarCodigos(idB);
    return codigosA.some(a => codigosB.some(b => a.fuente === b.fuente && a.valor === b.valor));
}

export function buildCodigoQuery(codigos: CodigoPrescripcion[] = []) {
    const validos = normalizarCodigos(codigos);
    if (!validos.length) {
        return null;
    }
    const consultas = validos.map(codigo => ({
        fuente: new RegExp(`^${codigo.fuente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        valor: codigo.valor
    }));
    return consultas.length === 1
        ? { $elemMatch: consultas[0] }
        : { $elemMatch: { $or: consultas } };
}
