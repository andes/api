import { elementoRUP } from '../schemas/elementoRUP';
import { Types } from 'mongoose';

export type ElementoRUP = any;

export type ElementoRUPSet = {
    getByID(id: string | Types.ObjectId): ElementoRUP;
    getByConcept(concepto, esSolicitud?: Boolean): ElementoRUP;
};

export async function elementosRUPAsSet(): Promise<ElementoRUPSet> {
    const cacheByID = {};
    const cacheByConcept = {};
    const cacheByConceptSolicitud = {};
    const defaults = {};
    const defaultsParaSolicitud = {};


    const elementosRUP = await elementoRUP.find();

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
            const ctid = requerido.concepto.conceptId;
            elemento.requeridosMap[ctid] = requerido;
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

    function traverseRegistros(registros, rootElemento: ElementoRUP) {
        registros.forEach((registro) => {
            const requerido = rootElemento.requeridosMap[registro.concepto.conceptId];
            registro.elementoRUPObject = elementosRUPSet.getByID(registro.elementoRUP);
            registro.params = (requerido && requerido.params) || {};

            traverseRegistros(registro.registros, registro.elementoRUPObject);

        });
    }

    const tipoPrestacion = prestacion.solicitud.tipoPrestacion;
    const elementoPrestacion = elementosRUPSet.getByConcept(tipoPrestacion);
    traverseRegistros(prestacion.ejecucion.registros, elementoPrestacion);

}
