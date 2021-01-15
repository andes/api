const { Engine } = require('json-rules-engine');
import * as request from 'request';

export let engine = new Engine();

let esPersonalSalud = {
    conditions: {
        all: [{
            fact: 'personal-salud',
            operator: 'equal',
            value: true
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

let personalSaludFact = async function (params, almanac) {
    const documento = await almanac.factValue('documento');
    return almanac.factValue('fuente')
        .then(fuente => {
            return new Promise(resolve => {
                request({
                    url: `${fuente.ruta}?documento=${documento}`,
                    json: true
                }, function (error, response) {
                    if (!error)
                        resolve(response.body);
                })
            }).then(response => {
                if (response[0]) {
                    return true
                } else {
                    return false;
                }
            });
        });
};

engine.addFact('personal-salud', personalSaludFact);

