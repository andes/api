import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoHeader extends HTMLComponent {
    template = `
            <!-- Header -->
            <header id="pageHeader">
                <!-- Cabezal logos institucionales -->
                <section class="contenedor-logos">
                    <span class="contenedor-logo-efector">
                    <img class="logo-efector" src="data:image/png;base64,{{ logos.logoEfector }}">
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
            </header>
            <!-- END Header -->
           `;

    constructor(public fechaCenso, public organizacion, public unidadOrganizativa) {
        super();

        let nombreLogo = organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');

        this.data = {
            unidadOrganizativa,
            fechaCenso,
            logos: {
                logoEfector: loadImage('templates/rup/informes/img/efectores/' + nombreLogo + '.png'),
                adicional: loadImage('templates/rup/informes/img/logo-adicional.png'),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
            },
        };
    }
}
