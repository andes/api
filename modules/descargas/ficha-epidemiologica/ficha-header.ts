import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';
import * as configPrivate from '../../../config.private';

export class FichaEpidemiologicaHeader extends HTMLComponent {
    template = `
                <section class="contenedor-logos">
                        <img class="logo-adicional" src="data:image/png;base64,{{ logos.adicional }}">
                        <img class="logo-andes" src="data:image/png;base64,{{ logos.andes }}">
                </section>
                <p class="texto-centrado">FICHA {{tipo}}</p>
        <hr/>
    `;

    constructor(public detalle, public organizacion) {
        super();
    }

    public async process() {
        const provincia = configPrivate.provincia || 'neuquen';
        this.data = {
            organizacion: this.organizacion,
            tipo: this.detalle.type.name.toUpperCase(),
            logos: {
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
            },
        };
    }
}
