export interface CodigoPrescripcion {
    fuente: string;
    valor: string;
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
    // se eliminan ids de algunos codigos y se normaliza fuente en minusculas
    identificador = (identificador || [])
        .filter(i => i && i.fuente && i.valor !== undefined && i.valor !== null)
        .map(i => ({ fuente: String(i.fuente).toLowerCase(), valor: String(i.valor) }));
    return { tipo, nombre, identificador };
}

export function matchIdentificador(idA: CodigoPrescripcion[] = [], idB: CodigoPrescripcion[] = []): boolean {
    if (!Array.isArray(idA) || !Array.isArray(idB) || !idA.length || !idB.length) {
        return false;
    }
    return idA.some(a =>
        a && a.fuente && a.valor !== undefined && a.valor !== null &&
        idB.some(b =>
            b && b.fuente && b.valor !== undefined && b.valor !== null &&
            String(a.fuente).toLowerCase() === String(b.fuente).toLowerCase() &&
            String(a.valor) === String(b.valor)
        )
    );
}

export function buildCodigoQuery(codigos: CodigoPrescripcion[] = []) {
    const validos = (codigos || []).filter(c => c && c.fuente && c.valor !== undefined && c.valor !== null);
    if (!validos.length) {
        return null;
    }
    if (validos.length === 1) {
        return {
            $elemMatch: {
                fuente: new RegExp(`^${validos[0].fuente}$`, 'i'),
                valor: String(validos[0].valor)
            }
        };
    }
    return {
        $elemMatch: {
            $or: validos.map(c => ({
                fuente: new RegExp(`^${c.fuente}$`, 'i'),
                valor: String(c.valor)
            }))
        }
    };
}
