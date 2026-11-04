export const COMPONENTE_EVOLUCION = 'EvolucionProblemaDefaultComponent';

export interface ResultadoEvolucion {
    texto: string;
    normalizada: boolean;
    invalida: boolean;
}

export interface ResultadoProcesamientoEvoluciones {
    normalizados: any[];
    invalidos: any[];
}

export type ResolverElementoRUP = (registro: any) => { componente?: string };

export function normalizarValorEvolucion(valor: any): ResultadoEvolucion {
    if (valor === null || valor === undefined) {
        return { texto: '', normalizada: false, invalida: false };
    }

    if (typeof valor !== 'object' || Array.isArray(valor)) {
        return { texto: '', normalizada: false, invalida: true };
    }

    const evolucion = valor.evolucion;

    if (evolucion === null || evolucion === undefined) {
        return { texto: '', normalizada: false, invalida: false };
    }

    if (typeof evolucion === 'string') {
        return { texto: evolucion, normalizada: false, invalida: false };
    }

    if (!Array.isArray(evolucion) && typeof evolucion === 'object' && typeof evolucion.evolucion === 'string') {
        return {
            texto: evolucion.evolucion,
            normalizada: true,
            invalida: false
        };
    }

    return { texto: '', normalizada: false, invalida: true };
}

export function procesarEvoluciones(
    registros: any[],
    resolverElemento: ResolverElementoRUP
): ResultadoProcesamientoEvoluciones {
    const normalizados = [];
    const invalidos = [];

    const recorrer = (lista: any[]) => {
        (lista || []).forEach(registro => {
            const elemento = resolverElemento(registro);

            if (elemento?.componente === COMPONENTE_EVOLUCION) {
                const resultado = normalizarValorEvolucion(registro.valor);

                if (resultado.normalizada) {
                    registro.valor.evolucion = resultado.texto;
                    normalizados.push(registro);
                } else if (resultado.invalida) {
                    invalidos.push(registro);
                }
            }

            recorrer(registro.registros);
        });
    };

    recorrer(registros);

    return { normalizados, invalidos };
}
