const { Engine } = require('json-rules-engine');
import { handleHttpRequest } from '../../utils/requestHandler';

export let engine = new Engine();

let conditions = {
    any: [
        {
            fact: 'personal-salud',
            operator: 'equal',
            value: true
        },
        {
            fact: 'edad-condition',
            operator: 'equal',
            value: true
        }
    ]
};
let event = {
    type: 'message',
    params: {
        message: 'regla aprobada ..'
    }
};

engine.addRule({ conditions, event });

/* Evalúa si el documento ingresado pertenece a personal de salud */
let personalSaludFact = async (params, almanac) => {
    const paciente = await almanac.factValue('paciente');
    const condicion = await almanac.factValue('condicion');
    if (condicion.fuente?.ruta) {
        const options = {
            url: `${condicion.fuente.ruta}?documento=${paciente.documento}`,
            json: true,
            timeout: 10000,
        };
        let response = await handleHttpRequest(options);
        if (response[0] === 200) {
            return response[1].length > 0;
        }
    }
    return false;
};

let edadFact = async (params, almanac) => {
    const paciente = await almanac.factValue('paciente');
    const condicion = await almanac.factValue('condicion');
    if (condicion.edad?.min && condicion?.edad?.max) {
        const edadMin = condicion.edad.min;
        const edadMax = condicion.edad.max;
        return edadMin <= paciente.edad && paciente.edad <= edadMax;
    }
    return false;
};


engine.addFact('personal-salud', personalSaludFact);
engine.addFact('edad-condition', edadFact);

