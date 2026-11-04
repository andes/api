import { ElementosRUPHTML } from '../elementos-rup';
import { HTMLComponent } from '../../model/html-component.class';

export async function registroToHTML(prestacion, registro, depth: number) {
    const elementoRUP = registro.elementoRUPObject;
    registro.params = {
        ...(elementoRUP?.params || {}),
        ...(registro.params || {}),
        ...(registro._original?.params || {}),
    };

    if (!elementoRUP) {
        // eslint-disable-next-line no-console
        console.warn(`INFORME-RUP: Prestacion ${prestacion && prestacion.id}|${registro && registro.id} no tiene elemento RUP`);
        return '';
    }

    const HTMLClass = ElementosRUPHTML[elementoRUP.componente];

    if (HTMLClass) {
        try {
            const componenteHTML: HTMLComponent = new (HTMLClass)(prestacion, registro, registro.params, depth);
            await componenteHTML.process();
            return componenteHTML.render();
        } catch (err) {
            const error: any = new Error(
                `INFORME-RUP: error en prestacion ${prestacion?.id} registro ${registro?.id} componente ${elementoRUP.componente}: ${err.message}`
            );
            error.status = err.status || 500;
            throw error;
        }
    } else {
        // eslint-disable-next-line no-console
        console.warn(`INFORME-RUP: Componente ${elementoRUP.componente} no tiene implementacion`);
        return '';
    }
}
