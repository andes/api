import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class CertificadoEticaBody extends HTMLComponent {
    template = `
    <style>
        .tabla-sanciones {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .tabla-sanciones thead td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .tabla-sanciones tbody td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
        }
        .tabla-posgrados {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .tabla-posgrados thead td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .tabla-posgrados tbody td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
        }
    </style>
    <main>
        <h3 align="center">
            <b>Provincia del Neuquén</b>
        </h3>
        <section>
            <div class="row">
                <div class="col">
                    <p>
                        La Dirección de Fiscalización Sanitaria de la Subsecretaría de Salud de la Provincia de Neuquén, CERTIFICA que {{ profesional.apellido }},
                        {{ profesional.nombre }} - DNI {{ profesional.documento }} se encuentra inscripto/a en el Registro Único de Profesionales de la Salud de la Provincia de
                        Neuquén como {{ matricula.grado.titulo }} bajo la matrícula N° {{ matricula.grado.matriculaNumero }} desde {{ matricula.grado.fechaAlta }}.
                    
                        {{#if tienePosgrados}}
                            Y como especialista en:
                            <br/><br/>
                            <table class="tabla-posgrados">
                                <thead>
                                    <tr>
                                        <td class="w-50">Especialidad</td>
                                        <td class="w-25">Mat N°</td>
                                        <td class="w-25">Desde</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{#each matricula.posgrados}}
                                        <tr>
                                            <td class="w-50">{{ titulo }}</td>
                                            <td class="w-25">{{ matriculaNumero }}</td>
                                            <td class="w-25">{{ fechaAlta }}</td>
                                        </tr>
                                    {{/each}}
                                </tbody>
                            </table>
                        {{/if}}
                    {{#if tieneSanciones}}
                        <p> <b>Según los registros de esta Dirección, el/la profesional registra las siguientes sanciones disciplinarias: </b></p>
                        <table class="tabla-sanciones">
                            <thead>
                                <tr>
                                    <td class="w-25">Tipo de sanción</td>
                                    <td class="w-25">Fecha de registro</td>
                                    <td class="w-25">Norma legal</td>
                                    <td class="w-25">Vencimiento</td>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each sanciones}}
                                    <tr>
                                        <td class="w-25">{{sancion.nombre}}</td>
                                        <td class="w-25">{{fecha}}</td>
                                        <td class="w-25">{{normaLegal}}</td>
                                        <td class="w-25">{{vencimiento}}</td>
                                    </tr>
                                {{/each}}
                            </tbody>
                        </table>
                    {{else}}
                        <p>
                            A la fecha, no surge de nuestros registros presuntas infracciones emergentes del incumplimiento de la Ley N° 578, y su Decreto Reglamentario N° 338/78, referidas al citado profesional.
                        </p>
                    {{/if}}
                    <p>
                        <b>{{ detalleExtension }}</b>
                    </p>
                    <p>
                        EL PRESENTE CERTIFICADO TIENE VALIDEZ POR EL TÉRMINO DE 30(TREINTA) DÍAS.
                    </p>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <!-- <img class="firmas" src="data:image/png;base64,{{ firmaJefeRegistro }}"> -->
                    <img class="firmas" src="data:image/png;base64,{{ firmaSupervisor }}">
                    <img  class="sello" src="data:image/png;base64,{{ selloSubse }}">

                </div>
            </div>
        </section>
    </main>
    `;

    constructor(public _data) {
        super();
        const tienePosgrados = (_data.matricula.posgrados?.length > 0);
        const firmaSupervisor = loadImage('templates/matriculaciones/img/firma-supervisor.png');
        const selloSubse = loadImage('templates/matriculaciones/img/sello.png');
        const footer = 'Dirección de Fiscalización Sanitaria | Antártida Argentina y Colón, Edif. CAM 3 | CP (8300) Neuquén | Tel.: 0299 - 4495590 / 5591';
        const detalleExtension = `Por pedido del interesado/a, a los fines que hubiere lugar, se extiende el presente, en Neuquén a los ${moment().format('D')} días del mes de ${(moment().locale('es').format('MMMM'))} de ${moment().format('YYYY')}.`;
        _data.matricula.grado.fechaAlta = moment(_data.matricula.grado.fechaAlta).format('DD/MM/YYYY');
        _data.matricula.posgrados?.map(p => p.fechaAlta = moment(p.fechaAlta).format('YYYY'));

        _data.sanciones?.map(s => {
            s.fecha = s.fecha ? moment(s.fecha).format('DD/MM/YYYY') : '-';
            s.vencimiento = s.vencimiento ? moment(s.vencimiento).format('DD/MM/YYYY') : '-';
            s.normaLegal = s.normaLegal || '-';
            return s;
        });

        if (_data.sanciones.length && !_data.sanciones[0].sancion.id) {
            _data.sanciones.shift();
        }

        _data.sanciones = _data.sanciones?.filter(sancion =>
            sancion.vencimiento && moment(sancion.vencimiento, 'DD/MM/YYYY').isAfter(moment())
        ) || [];

        const tieneSanciones = (_data.sanciones?.length > 0);

        this.data = {
            matricula: _data.matricula,
            profesional: _data.profesional,
            tienePosgrados,
            detalleExtension,
            footer,
            firmaSupervisor,
            selloSubse,
            tieneSanciones,
            sanciones: _data.sanciones
        };
    }

    parseFecha(fecha) {
        return moment(fecha).format('DD/MM/YYYY');
    }
}
