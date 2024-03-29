import { ElementoRUP, IElementoRUPDoc } from '../schemas/elementoRUP';
import { Types } from 'mongoose';
import { AppCache } from '../../../connections';

export type IElementoRUPDocExt = IElementoRUPDoc & { requeridosMap: { [key: string]: any } };

export type ElementoRUPSet = {
    getByID(id: string | Types.ObjectId): IElementoRUPDocExt;
    getByConcept(concepto, esSolicitud?: Boolean): IElementoRUPDocExt;
};

export async function getElementosRUP(): Promise<IElementoRUPDoc[]> {

    const key = 'elementos-rup';
    const elementosRUPCache = await AppCache.get(key);
    if (elementosRUPCache) {
        return elementosRUPCache;
    }
    const elementosRUP = await ElementoRUP.find();
    AppCache.set(key, elementosRUP, 60 * 60 * 2);

    return elementosRUP;
}

export async function elementosRUPAsSet(): Promise<ElementoRUPSet> {
    const cacheByID = {};
    const cacheByConcept = {};
    const cacheByConceptSolicitud = {};
    const defaults = {};
    const defaultsParaSolicitud = {};


    const elementosRUP = await getElementosRUP();

    elementosRUP.forEach((elemento: any) => {
        const id = String(elemento._id);

        cacheByID[id] = elemento;

        elemento.conceptos.forEach((concepto) => {
            if (elemento.esSolicitud) {
                cacheByConceptSolicitud[concepto.conceptId] = elemento;
            } else {
                cacheByConcept[concepto.conceptId] = elemento;
            }
        });
        if (elemento.defaultFor && elemento.defaultFor.length) {
            elemento.defaultFor.forEach((semanticTag) => {
                if (elemento.esSolicitud) {
                    defaultsParaSolicitud[semanticTag] = elemento;
                } else {
                    defaults[semanticTag] = elemento;
                }
            });
        }

        elemento.requeridosMap = {};

        elemento.requeridos.forEach((requerido) => {
            if (requerido.concepto) {
                const ctid = requerido.concepto.conceptId;
                elemento.requeridosMap[ctid] = requerido;
            }
        });

    });

    return {
        getByID(id: string | Types.ObjectId) {
            return cacheByID[String(id)];
        },
        getByConcept(concepto, esSolicitud: Boolean = null) {
            if (esSolicitud) {
                const elemento = cacheByConceptSolicitud[concepto.conceptId];
                if (elemento) {
                    return elemento;
                } else {
                    return defaultsParaSolicitud[concepto.semanticTag];
                }
            } else {
                const elemento = cacheByConcept[concepto.conceptId];
                if (elemento) {
                    return elemento;
                } else {
                    return defaults[concepto.semanticTag];
                }
            }
        }
    };
}

export async function fulfillPrestacion(prestacion, elementosRUPSet: ElementoRUPSet) {

    async function traverseRegistros(registros, rootElemento: IElementoRUPDocExt) {
        for (const registro of registros) {
            const requerido = rootElemento.requeridosMap[registro.concepto.conceptId];
            if (registro.elementoRUP) {
                registro.elementoRUPObject = elementosRUPSet.getByID(registro.elementoRUP);
            } else {
                registro.elementoRUPObject = elementosRUPSet.getByConcept(registro.concepto, registro.esSolicitud);
            }
            registro.params = (requerido && requerido.params) || {};

            traverseRegistros(registro.registros, registro.elementoRUPObject);
        }
    }

    const tipoPrestacion = prestacion.solicitud.tipoPrestacion;
    const elementoPrestacion = elementosRUPSet.getByConcept(tipoPrestacion);
    await traverseRegistros(prestacion.ejecucion.registros, elementoPrestacion);

}
