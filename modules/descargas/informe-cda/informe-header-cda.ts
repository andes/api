import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';
import * as configPrivate from '../../../config.private';
import moment = require('moment');

export class InformeCDAHeader extends HTMLComponent {
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
        <section class="contenedor-data-origen">
            <!-- DATOS DEL PACIENTE -->
            <span class="contenedor-principal-data">
                <div class="contenedor-secundario">
                    <h6 class="volanta">Datos del paciente</h6>
                    <h4>
                        {{ paciente.apellido }},  
                        {{#if paciente.alias}} 
                            {{paciente.alias}}
                        {{else}}
                            {{paciente.nombre}}
                        {{/if}}
                    </h4>
                    <h4>
                        {{ paciente.genero }} |
                        {{#if paciente.edad }}
                            {{ paciente.edad }} años |
                        {{/if}}
                        {{ paciente.documento }}
                    </h4>
                </div>
                <div class="contenedor-secundario">
                    <div class="contenedor-bloque-texto" >
                        <h6>
                            <b>Obra Social: </b>
                            {{#if paciente.obraSocial}}
                                {{paciente.obraSocial}}
                            {{else}}
                                sin obra social
                            {{/if}}
                        </h6>
                    </div>
                </div>
                    <div class="contenedor-secundario">
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">
                                Fecha de Nac.
                            </h6>
                            <h6>
                                {{ paciente.fechaNacimiento }}
                            </h6>
                        </div>
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">
                                Nro. de carpeta
                            </h6>
                            <h6>
                                {{#if paciente.numeroCarpeta }}
                                    {{ paciente.numeroCarpeta }}
                                {{else}}
                                    sin número de carpeta
                                {{/if}}
                            </h6>
                        </div>
                    </div>
                </span>

                <span class="contenedor-principal-data">
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos de la prestación</h6>
                        <h4>
                            {{{ organizacion.nombre }}}
                        </h4>
                        <h5>
                            {{ organizacion.direccion }}
                        </h5>
                    </div>
                    <div class="contenedor-secundario">
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">Profesional</h6>
                            <h6>
                                {{ profesional.apellido }}, {{ profesional.nombre }}
                            </h6>
                        </div>
                    </div>
                </span>
        </section>
    `;

    constructor(public organizacion, public paciente, public profesional) {
        super();
        const provincia = configPrivate.provincia || 'neuquen';
        const fechaNacimiento = paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('DD/MM/YYYY') : 's/d';
        const edad = moment().diff(moment(paciente.fechaNacimiento), 'years');
        const numeroCarpeta = paciente.carpetaEfectores.find(efector => String(efector.organizacion._id) === organizacion._id);
        this.data = {
            logos: {
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
                organizacion: organizacion ? this.getLogoOrganizacion(organizacion) : ''
            },
            organizacion: {
                nombre: organizacion ? organizacion.nombre.replace('-', '</br>') : '',
                direccion: organizacion ? organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre : ''
            },
            paciente: {
                nombre: paciente.nombre,
                apellido: paciente.apellido,
                alias: paciente.alias || undefined,
                genero: paciente.genero,
                fechaNacimiento,
                documento: paciente.documento,
                numeroIdentificacion: paciente.numeroIdentificacion || undefined,
                edad,
                numeroCarpeta: numeroCarpeta?.nroCarpeta,
                obraSocial: paciente.financiador.length ? paciente.financiador[paciente.financiador.length - 1].nombre : false
            },
            profesional: {
                nombre: profesional.nombre,
                apellido: profesional.apellido
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
