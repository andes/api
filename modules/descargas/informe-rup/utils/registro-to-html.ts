import { ElementosRUPHTML } from '../elementos-rup';
import { HTMLComponent } from '../../model/html-component.class';

export async function registroToHTML(prestacion, registro, depth: number) {
    const elementoRUP = registro.elementoRUPObject;

    const HTMLClass = ElementosRUPHTML[elementoRUP.componente];

    if (HTMLClass) {
        const componenteHTML: HTMLComponent = new (HTMLClass)(prestacion, registro, registro.params, depth);
        await componenteHTML.process();
        return componenteHTML.render();
    } else {
        // tslint:disable-next-line:no-console
        console.warn(`INFORME-RUP: Componente ${elementoRUP.componente} no tiene implementacion`);
        return '';
    }
}
