import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';
import * as configPrivate from '../../../config.private';

export class CensoHeader extends HTMLComponent {
    template = `
                <!-- Cabezal logos institucionales -->
                <section class="contenedor-logos">
                    <span class="contenedor-logo-efector">
                        {{#if logos.logoEfector}}
                            <img class="logo-efector" src="data:image/png;base64,{{ logos.logoEfector }}">
                        {{else}}
                            <b class="no-logo-efector">
                                {{{ organizacion.nombre }}}
                            </b>
                        {{/if}}
                    </span>
                    <span class="contenedor-logos-secundarios">
                        <img class="logo-adicional" src="data:image/png;base64,{{ logos.logoAdicional }}">
                        <img class="logo-andes" src="data:image/png;base64,{{ logos.logoAndes }}">
                    </span>
                </section>
                <section class="contenedor-data-origen">
                    <span class="contenedor-principal-data">
                        <div class="contenedor-secundario">
                            <h4>
                                Censo diario
                            </h4>
                            <h5 class="bolder">Fecha:
                                {{ fechaCenso }}
                            </h5>
                            <h5 class="bolder">Unidad organizativa:
                                {{ unidadOrganizativa }}
                            </h5>
                        </div>
                    </span>
                </section>
           `;

    constructor(public fechaCenso, public organizacion, public unidadOrganizativa) {
        super();

        // consulta por provincia
        const provincia = configPrivate.provincia || 'neuquen';

        this.data = {
            unidadOrganizativa,
            fechaCenso,
            organizacion,
            logos: {
                logoEfector: this.getLogoOrganizacion(organizacion),
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
            },
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
