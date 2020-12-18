import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';

export class ArancelamientoBody extends HTMLComponent {
    template = ` <section class="contenedor">
    <!-- Datos paciente -->
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Datos del paciente</h6>
            <h4>
                {{ nombrePaciente }}
            </h4>
            <h4>
            {{ documentoPaciente }}
            </h4>
        </div>
    </span>

    <!-- Datos origen solicitud -->
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Edad</h6>
            <h4>
                {{{ edadPaciente }}}
            </h4>
        </div>
        <div class="contenedor-secundario">
            {{#if numeroCarpeta}}
                <h6 class="volanta">Nro. de carpeta</h6>
                <h4>
                    {{ numeroCarpeta }}
                </h4>
            {{/if}}
        </div>
    </span>
</section>

<section class="contenedor">
    <!-- Datos paciente -->
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Obra social</h6>
            <h4>
                {{ obraSocial }}
            </h4>
        </div>
    </span>

    {{#if codigoOs}}
        <span class="contenedor-principal-data">
            <div class="contenedor-secundario">
                <h6 class="volanta">Código</h6>
                <h4>
                    {{ codigoOs }}
                </h4>
            </div>
        </span>
    {{/if}}

    {{#if numeroAfiliado}}
        <span class="contenedor-principal-data">
            <div class="contenedor-secundario">
                <h6 class="volanta">Número de Afiliado</h6>
                <h4>
                    {{ numeroAfiliado }}
                </h4>
            </div>
        </span>
    {{/if}}

</section>

<section class="contenedor">
    <!-- Datos paciente -->
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Prestación</h6>
            <h4>
                {{ codigoNomenclador }}
            </h4>
            <h4>
                {{ prestacion }}
            </h4>
        </div>
    </span>
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Efector</h6>
            <h4>
                {{ efector }}
            </h4>
        </div>
    </span>
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Fecha y hora</h6>
            <h4>
                {{ horaTurno }}
            </h4>
        </div>
    </span>
</section>

<section class="contenedor">
    <!-- Datos paciente -->
    <span class="contenedor-principal-data">
        <div class="contenedor-secundario">
            <h6 class="volanta">Motivo de Consulta / Diagnóstico</h6>
            <h4>
                {{ motivoConsulta }}
            </h4>
        </div>
    </span>
</section>


<section class="contenedor firma" style='margin-top:30px'>
    <span class="contenedor-principal-data" >
        <h6 class='volanta paciente' >Firma del paciente</h6>
    </span>
    <span class="contenedor-principal-data">
        <div>
            {{#if firmaHTML}}
                {{{ firmaHTML }}}
            {{/if}}

            {{#if firma}}
                {{#if firma.foto}}
                    <img style='width:100px' src="{{ firma.foto }}">
                {{/if}}

                <h4>{{ firma.nombre }}</h4>
                <h6 class="volanta">
                    {{ firma.aclaracion1 }}<br>
                    {{ firma.aclaracion2 }}

                    {{#if firma.aclaracion3}}
                        <br>
                        {{ firma.aclaracion3 }}
                    {{/if}}
                </h6>
            {{/if}}
        <div>
    </span>

</section>
`;

    constructor(public _data) {
        super();

        const getNroCarpeta = (turno) => {
            let numeroCarpeta;
            if (turno.paciente && turno.paciente.carpetaEfectores && turno.paciente.carpetaEfectores.length) {
                let resultado = turno.paciente.carpetaEfectores.filter(
                    carpeta => (String(carpeta.organizacion._id) === _data.organizacionId && carpeta.nroCarpeta)
                );
                if (resultado && resultado.length) {
                    numeroCarpeta = resultado[0].nroCarpeta;
                }
            }
            return numeroCarpeta;
        };

        const paciente = _data.turno.paciente;
        this.data = {
            nombrePaciente: `${ paciente.apellido }, ${ paciente.nombre }`,
            documentoPaciente: paciente.documento,
            edadPaciente: calcularEdad(paciente.fechaNacimiento, paciente.fechaFallecimiento),
            numeroCarpeta: getNroCarpeta(_data.turno),
            horaTurno: moment(_data.turno.horaInicio).locale('es').format('ddd DD/MM/YYYY, h:mm a'),
            efector: _data.organizacionNombre,
            obraSocial: paciente.obraSocial.financiador,
            codigoOs: paciente.obraSocial ? paciente.obraSocial.codigoFinanciador : '-',
            numeroAfiliado: paciente.obraSocial.numeroAfiliado,
            motivoConsulta: _data.turno.motivoConsulta,
            codigoNomenclador: _data.resultadoFA ? _data.resultadoFA.recuperoFinanciero.codigo : null,
            prestacion: _data.turno.tipoPrestacion.term
        };

        if (_data.firmaHTML) {
            this.data.firmaHTML = _data.firmaHTML;
        } else if (_data.config['arancelamiento.firma']) {
            this.data.firma = {
                foto: _data.config['arancelamiento.firma'],
                nombre: _data.config['arancelamiento.nombre'],
                aclaracion1: _data.config['arancelamiento.aclaracion1'],
                aclaracion2: _data.config['arancelamiento.aclaracion2'],
                aclaracion3: _data.config['arancelamiento.aclaracion3']
            };
        } else {
            this.data.firma = {
                nombre: `${_data.profesional.apellido} ${_data.profesional.nombre}`,
                aclaracion1: _data.organizacionNombre.substring(0, _data.organizacionNombre.indexOf('-')),
                aclaracion2: ''
            };
        }
    }
}
