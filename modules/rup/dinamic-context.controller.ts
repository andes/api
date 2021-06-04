import { services } from '../../services';
import { ETL } from '@andes/etl';


type Context = { [key: string]: any };
type ContextDefinition = {
    name: string;
    service: string;
    params?: any;
    dependsOn?: string[];
};

export async function loadDinamicContext(contextDefinition: ContextDefinition[], initialContext: Context) {
    const etl = new ETL();
    const contexto: Context = { ...initialContext };

    const totalContext = contextDefinition.length;
    let loadedContext = 0;

    do {

        for (const contextDef of contextDefinition) {
            if (checkDependencies(contexto, contextDef)) {

                const params = etl.transform(contexto, contextDef.params);

                const resultado = await services.get(contextDef.service).exec(params);

                contexto[contextDef.name] = resultado;

                loadedContext++;

            }
        }


    } while (totalContext !== loadedContext);

    return contexto;

}

function checkDependencies(contexto: Context, def: ContextDefinition) {
    if (!def.dependsOn) {
        return true;
    }
    return def.dependsOn.every(d => !!contexto[d]);
}

/**
 * EJEMPLO
 */

const dinamicContext = [
    {
        name: 'fractura',
        service: 'paciente-huds-registros',
        params: {
            paciente: '$.prestacion.paciente.id',
            expression: '<<15574005'
        },
        dependsOn: []
    }
];
