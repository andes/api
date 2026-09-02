import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';
import * as configPrivate from '../../../config.private';

export class FarmaciaHeader extends HTMLComponent {

    template = `
    <section class="contenedor-logos">
            <span class="contenedor-logo-efector">
                {{#if logos.organizacion}}
                    <img class="logo-efector" src="data:image/png;base64,{{ logos.organizacion }}">
                {{else}}
                    <b class="no-logo-efector">
                        {{ organizacion.nombre }}
                    </b>
                {{/if}}
            </span>
            <span class="contenedor-logos-secundarios">
                <img class="logo-adicional" src="data:image/png;base64,{{ logos.adicional }}">
                <img class="logo-andes" src="data:image/png;base64,{{ logos.andes  }}">
            </span>
        </section>
`;

    constructor(public encabezado) {
        super();
    }

    public async process() {
        const organizacion = this.encabezado.data.Efector || this.encabezado.data.Laboratorio;
        const provincia = configPrivate.provincia || 'neuquen';

        this.data = {
            organizacion: {
                nombre: organizacion?.nombre || organizacion || ''
            },
            logos: {
                organizacion: organizacion ? this.getLogoOrganizacion(organizacion) : '',
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
            },
        };
    }

    getLogoOrganizacion(organizacion) {
        try {
            const nombre = organizacion.nombre || organizacion;
            const nombreLogo = nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            const realPath = `templates/rup/informes/img/efectores/${nombreLogo}.png`;
            return loadImage(realPath);
        } catch {
            return null;
        }
    }
}
