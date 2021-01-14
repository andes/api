import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../../auth/auth.class';
import { IInternacionResumen, IInternacionResumenDoc, InternacionResumen } from './internacion-resumen.schema';

class InternacionResumenController extends ResourceBase<IInternacionResumenDoc> {
    Model = InternacionResumen;
    resourceName = 'internacion-resumen';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: {
            field: 'organizacion.id',
            fn: MongoQuery.matchString
        },
        ingreso: MongoQuery.matchDate.withField('fechaIngreso'),
        egreso: MongoQuery.matchDate.withField('fechaEgreso')
    };

    async populate(data: IInternacionResumen) {
        const registros = data.ingreso?.registros || [];
        const concepto = deepSearch(registros);
        if (concepto) {
            switch (concepto.valor.conceptId) {
                case '394848005':
                    data.prioridad = { id: 1, label: 'BAJA', type: 'success' };
                    break;
                case '1331000246106':
                    data.prioridad = { id: 50, label: 'MEDIA', type: 'warning' };
                    break;
                case '394849002':
                    data.prioridad = { id: 100, label: 'ALTA', type: 'danger' };
                    break;
            }
        }
        return data;
    }
}

export const InternacionResumenCtr = new InternacionResumenController({});
export const InternacionResumenRouter = InternacionResumenCtr.makeRoutes();


function deepSearch(registros: any[]) {
    for (let i = 0; i < registros.length; i++) {
        if (registros[i].concepto.conceptId === '225390008') {
            return registros[i];
        } else {
            const reg = deepSearch(registros[i].registros);
            if (reg) {
                return reg;
            }
        }
    }
    return null;
}
