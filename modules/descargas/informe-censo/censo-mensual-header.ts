import * as moment from 'moment';
import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoMensualHeader extends HTMLComponent {
    template = `
    <!-- Header -->
    <header id="pageHeader">
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
                    <h3>
                        Censo mensual
                    </h3>
                    <h5 class="bolder">
                        <strong>Fecha:</strong>
                        {{ fechaCensoDesde }}
                        -
                        {{ fechaCensoHasta }}
                    </h5>
                    <h5 class="bolder">Unidad organizativa:
                        {{ unidadOrganizativa }}
                    </h5>
                </div>
            </span>
        </section>
    </header>
    <!-- END Header -->
    `;

    constructor(public organizacion, public unidadOrganizativa, public fechaDesde, public fechaHasta) {
        super();

        this.data = {
            unidadOrganizativa,
            fechaCensoDesde: moment(fechaDesde).format('DD/MM/YYYY'),
            fechaCensoHasta: moment(fechaHasta).format('DD/MM/YYYY'),
            organizacion: {
                nombre: organizacion.nombre.replace(' - ', '</br>'),
            },
            logos: {
                logoEfector: this.getLogoOrganizacion(organizacion),
                adicional: loadImage('templates/rup/informes/img/logo-adicional.png'),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png')
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
