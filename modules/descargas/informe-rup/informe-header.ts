import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { loadImage } from '../model/informe.class';

export class InformeRupHeader extends HTMLComponent {
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
            <section class="contenedor-data-origen">
                <!-- Datos paciente -->
                <span class="contenedor-principal-data">
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos del paciente</h6>
                        <h4>
                            {{ paciente.apellido }}, {{ paciente.nombre }}
                        </h4>
                        <h4>
                            {{ paciente.sexo }} |
                            {{#if paciente.edad }}
                                {{ paciente.edad }} años |
                            {{/if}}
                            {{ paciente.documento }}
                        </h4>
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
                        <div class="contenedor-bloque-texto">
                            <h6>
                                <!--obraSocial-->
                            </h6>
                        </div>
                    </div>
                </span>

                <!-- Datos origen solicitud -->
                <span class="contenedor-principal-data">
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos de origen de solicitud</h6>
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
            {{#unless consultaValidada }}
                <h1 class="marca-de-agua">
                    Prestación no validada por profesional
                </h1>
            {{/unless}}
    `;

    constructor(public prestacion, public paciente, public organizacion) {
        super();

        // [TODO] helpers date formats en Handlerbars

        const fechaNacimiento = paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('DD/MM/YYYY') : 's/d';
        const fechaPrestacion = moment(prestacion.ejecucion.fecha);
        const edad = paciente.fechaNacimiento && fechaPrestacion.diff(moment(paciente.fechaNacimiento), 'years');
        const organizacionId = String(prestacion.ejecucion.organizacion.id);

        // [TODO] metodo getCarpeta en paciente
        const numeroCarpeta = paciente.carpetaEfectores.find(x => String(x.organizacion._id) === organizacionId);
        const consultaValidada = (prestacion.estados[prestacion.estados.length - 1].tipo === 'validada');

        this.data = {
            paciente: {
                nombre: paciente.nombre,
                apellido: paciente.apellido,
                sexo: paciente.sexo,
                fechaNacimiento,
                documento: paciente.documento,
                edad,
                numeroCarpeta: numeroCarpeta?.nroCarpeta
            },
            organizacion: {
                nombre: organizacion.nombre.replace(' - ', '</br>'),
                direccion: organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre
            },
            profesional: {
                nombre: prestacion.solicitud.profesional.nombre,
                apellido: prestacion.solicitud.profesional.apellido
            },
            consultaValidada,
            logos: {
                adicional: loadImage('templates/rup/informes/img/logo-adicional.png'),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
                organizacion: this.getLogoOrganizacion(organizacion)
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
