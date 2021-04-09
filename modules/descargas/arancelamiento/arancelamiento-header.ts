import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';
import * as configPrivate from '../../../config.private';

export class ArancelamientosHeader extends HTMLComponent {
    template = `
        <!-- Cabezal logos institucionales -->
        <section class="contenedor-logos">
            <span class="contenedor-logo-efector">
                {{#if logos.organizacion}}
                    <img class="logo-efector" src="data:image/png;base64,{{ logos.organizacion }}">
                {{else}}
                    <b class="no-logo-efector">
                        {{{ organizacion.nombre }}}
                    </b>
                {{/if}}
            </span>
            <span class="contenedor-logos-secundarios">
                <img class="logo-adicional" src="data:image/png;base64,{{ logos.adicional }}">
                <img class="logo-andes" src="data:image/png;base64,{{ logos.andes  }}">
            </span>
        </section>
    `;

    constructor(_data) {
        super();
        const provincia = configPrivate.provincia.nombre || 'neuquen';

        this.data = {
            logos: {
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
                organizacion: _data.organizacion ? this.getLogoOrganizacion(_data.organizacion) : '',
            }
        };
    }

    getLogoOrganizacion(organizacion) {
        try {
            const nombreLogo = organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            const realPath = `templates/rup/informes/img/efectores/${nombreLogo}.png`;
            return loadImage(realPath);
        } catch {
            return null;
        }
    }
}
