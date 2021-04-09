import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';
import * as configPrivate from '../../../config.private';

export class AgendaHeader extends HTMLComponent {
    template = `
                <section class="contenedor-logos">
                        <img class="logo-adicional" src="data:image/png;base64,{{ logos.adicional }}">
                        <img class="logo-andes" src="data:image/png;base64,{{ logos.andes }}">
                </section>
                `;

    constructor() {
        super();
        // consulta por provincia
        const provincia = configPrivate.provincia.nombre || 'neuquen';

        this.data = {
            logos: {
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
            },
        };
    }
}
