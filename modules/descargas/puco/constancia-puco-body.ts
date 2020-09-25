import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class ConstanciaPucoBody extends HTMLComponent {
    template = `
        <main>
        <h6 align="center">
            <u>CONSTATACIÓN PADRÓN
                {{ padron }}</u>
        </h6>
        <section class="bordered-section">
            <div class="row">
                <div class="col">
                    <span>DATOS DE AFILIACIÓN</span>
                </div>
            </div>
            <br>
            <div class="row">
                <div class="col">
                    <span>NOMBRE Y APELLIDO:
                        {{ nombre }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>DNI:
                        {{ dni }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>CUIL/CUIT: xxxxxxxxxx</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>PARENTESCO: TITULAR</span>
                </div>
            </div>
            <br>
            <div class="row">
                <div class="col">
                    <label>
                        <FONT SIZE=2>OBRA SOCIAL:
                            {{ financiador }}
                        </FONT>
                    </label>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <label>FECHA DE ALTA: xx/xx/xxxx</label>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <label>
                        {{ claveBeneficiario }}</label>
                </div>
            </div>
        </section>
        <br><br>
        <div class="row">
            <div class="col leyenda">
                <p>
                    {{ textFooter }}
                </p>
                <p>Fecha de verificación:
                    {{ fechaActual }}
                </p>
            </div>
        </div>
    </main>

    `;

    constructor(public _data) {
        super();
        let padron;
        let textFooter;
        const fechaActual = moment(new Date()).locale('es').format('DD [de] MMMM [de] YYYY');
        if (_data.financiador === 'Programa SUMAR') {
            padron = 'SUMAR';
            textFooter = 'Por la presente DEJO CONSTANCIA que la persona antes detallada está INSCRIPTA EN EL PLAN SUMAR.<br/>' +
                'Reune los requisitos necesarios para el proceso de validación.<br/><br/>' +
                'VÁLIDO PARA SER PRESENTADO ANTE AUTORIDADES DE ANSES.<br/>' +
                'VÁLIDO DENTRO DE LOS 60 DÍAS DE LA FECHA DE EMISIÓN.<br/>' +
                'Sin otro particular, saluda atentamente<br/>';
        } else {
            padron = 'PUCO';
            textFooter = '(La presente tiene carácter de declaración jurada a los efectos de la Ley Provincial 3012, y ' +
                'Disposición Provincial 1949/' + moment(new Date()).format('YYYY');
        }

        this.data = {
            padron,
            nombre: _data.nombre,
            dni: _data.dni,
            financiador: `${_data.codigoFinanciador} ${_data.financiador}`,
            claveBeneficiario: _data.claveBeneficiario ? `Clave de Beneficiario: ${_data.claveBeneficiario}` : ``,
            textFooter,
            fechaActual
        };
    }
}
