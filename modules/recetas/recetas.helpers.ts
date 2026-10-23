export interface CodigoPrescripcion {
    fuente: string;
    valor: string;
}

export interface IdentificadorPrescripcion {
    nombre: string;
    conceptId: string;
    codigo: CodigoPrescripcion[];
}

/**
 * Resuelve y normaliza la identificación de una prescripción (medicamento, magistral, insumo, dispositivo, nutrición).
 * Extrae nombre descriptivo, conceptId de SNOMED/ANDES y códigos externos/magistrales.
 */
export function resolverIdentificador(prescripcion: any, tipo?: string): IdentificadorPrescripcion {
    if (!prescripcion) {
        return null;
    }
    const esMagistral = tipo === 'magistral' || !!prescripcion.esMagistral;
    const esMedicamento = tipo === 'medicamento';

    // 1. Nombre
    const nombre = esMagistral
        ? (prescripcion.magistral?.nombre || prescripcion.concepto?.nombre || prescripcion.concepto?.term || prescripcion.nombre)
        : (esMedicamento
            ? (prescripcion.concepto?.term || prescripcion.generico?.term || prescripcion.nombre)
            : (prescripcion.generico?.nombre || prescripcion.nombre));

    // 2. conceptId de ANDES (si es de SNOMED o concepto ANDES)
    const conceptId = prescripcion.concepto?.conceptId
        || prescripcion.generico?.conceptId
        || (prescripcion.concepto?._id ? String(prescripcion.concepto._id) : null);

    // 3. Códigos (magistrales, insumos con [{ fuente, valor }], o código alfanumérico externo)
    let codigosRaw = prescripcion.magistral?.codigo
        || prescripcion.concepto?.codigo
        || prescripcion.generico?.codigo
        || prescripcion.codigo
        || prescripcion.insumo?.codigo
        || [];

    if (!Array.isArray(codigosRaw)) {
        if (codigosRaw && typeof codigosRaw === 'object' && (codigosRaw.fuente || codigosRaw.valor)) {
            codigosRaw = [codigosRaw];
        } else if (typeof codigosRaw === 'string' && codigosRaw.trim()) {
            codigosRaw = [{ fuente: prescripcion.fuente || 'externo', valor: codigosRaw.trim() }];
        } else {
            codigosRaw = [];
        }
    }

    const codigo: CodigoPrescripcion[] = codigosRaw.map((c: any) => ({
        fuente: c.fuente || 'externo',
        valor: c.valor || c.codigo || (typeof c === 'string' ? c : '')
    })).filter((c: any) => c.valor);

    // Si viene código externo en prescripcion.origenExterno y no está en codigo
    if (prescripcion.origenExterno?.id && !codigo.some((c: any) => c.valor === prescripcion.origenExterno.id)) {
        codigo.push({
            fuente: prescripcion.origenExterno.app || 'recetar',
            valor: String(prescripcion.origenExterno.id)
        });
    }

    return {
        nombre,
        conceptId,
        codigo
    };
}
