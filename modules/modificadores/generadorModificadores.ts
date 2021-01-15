import { PersonalSaludRouter } from '../personalSalud/personal-salud.routes';
const { Engine } = require('json-rules-engine');


/**
 * Setup a new engine
 */
export let engine = new Engine();

let esPersonalSalud = {
    conditions: {
        all: [{
            fact: 'documento',
            operator: 'equal',
            value: '34658023'
        }]
    },
    event: {
        type: 'message',
        params: {
            message: 'documento correcto ...'
        }
    }
};

engine.addRule(esPersonalSalud);

engine.addFact('documento', (params, almanac) => {
    return almanac.factValue('fuente')
        .then(fuente => {
            const resp = PersonalSaludRouter.get(`${fuente.ruta}?${params.documento}`);
            return resp;
        });
});
