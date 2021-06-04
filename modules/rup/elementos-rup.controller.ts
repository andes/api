
import { ElementoRUP } from './schemas/elementoRUP';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Prestacion } from './schemas/prestacion';
import { Engine } from 'json-rules-engine';
import { IPrestacionDoc } from './prestaciones.interface';
import * as moment from 'moment';
import { loadDinamicContext } from './dinamic-context.controller';
import { ElementoRUPRequeridos } from './schemas/elementos-rup-requeridos.schema';

class ElementoRUPResource extends ResourceBase {
    Model = ElementoRUP;
    resourceName = 'elementos-rup';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        activo: MongoQuery.equalMatch,
        componente: MongoQuery.equalMatch,
        defaultFor: MongoQuery.equalMatch,
        tipo: MongoQuery.equalMatch,
        esSolicitud: MongoQuery.equalMatch,
        concepto: {
            field: 'conceptos.conceptId',
            fn: MongoQuery.equalMatch
        },
        term: {
            field: 'conceptos.term',
            fn: MongoQuery.partialString
        },
    };
}


export const ElementoRUPCtr = new ElementoRUPResource({});
export const ElementoRUPRouter = ElementoRUPCtr.makeRoutes();

ElementoRUPRouter.post('/elementos-rup/requeridos', Auth.authenticate(), async (req, res, next) => {
    const prestacionID = req.body.prestacion;
    const conceptId = req.body.conceptId;

    const reglas = await ElementoRUPRequeridos.find({ 'concepto.conceptId': conceptId, active: true });

    const prestacion = await Prestacion.findById(prestacionID) as IPrestacionDoc;

    const r = [];

    for (const _regla of reglas) {
        const regla = _regla.toObject();
        const contexto = await loadDinamicContext(
            regla.contexto,
            { prestacion: prestacion.toObject() }
        );


        const engine = new Engine();

        engine.addOperator('dateGreaterThan', (a: Date, b: Date) => {
            return a.getTime() >= b.getTime();
        });

        engine.addOperator('dateLessThan', (a: Date, b: Date) => {
            return a.getTime() <= b.getTime();
        });

        engine.addRule({
            conditions: regla.rules,
            event: {
                type: 'valid',
                params: {
                    target: regla.target
                }
            }
        });

        engine.addFact('date', (params) => {
            const add = params.add;
            const unit = params.unit;

            return moment().add(add, unit).toDate();


        }, { cache: false });

        Object.keys(contexto).forEach(
            key => engine.addFact(key, contexto[key])
        );

        const resultado: any = await runEngine(engine);

        if (resultado) {
            const { target } = resultado.params;
            target.forEach(t => r.push(t));
        }

    }

    res.json(r);


});

async function runEngine(engine) {
    return new Promise((resolve, reject) => {
        engine
            .run()
            .then(({ events }) => {
                if (events.length > 0) {
                    return resolve(events[0]);
                } else {
                    return resolve(null);
                }
            });
    });
}
