import { SeguimientoPaciente } from '../modules/seguimiento-paciente/schemas/seguimiento-paciente.schema';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import * as moment from 'moment';

const altaCid = '201000246105';
let desde: string;
let hasta: string;
let idPaciente: string;
let seguimientos;
async function run(done) {
    // Envio fechas desde y hasta
    if (process.argv.length === 5) {
        desde = process.argv[3];
        hasta = process.argv[4];
        const start = moment(desde).toDate();
        const end = moment(hasta).toDate();
        seguimientos = await SeguimientoPaciente.find({
            $or: [{ 'ultimoEstado.clave': 'pendiente' }, { 'ultimoEstado.clave': 'seguimiento' }],
            createdAt: { $gte: start, $lte: end }
        }).cursor({ batchSize: 100 });
    } else { // Posibilidad de enviar solo un id de paciente
        idPaciente = process.argv[3];
        seguimientos = SeguimientoPaciente.find({
            'paciente.id': idPaciente
        });
    }
    for await (const seguimiento of seguimientos) {
        const pacienteId = seguimiento.paciente.id;
        const prestacionDesde = seguimiento.createdAt;
        const prestacionHasta = moment(prestacionDesde).add(30, 'days').toDate();
        const pipeline = {
            'paciente.id': pacienteId,
            'estadoActual.tipo': 'validada',
            'estadoActual.createdAt': { $gte: prestacionDesde, $lte: prestacionHasta },
        };
        const prestaciones = await Prestacion.find(pipeline);
        for (const prestacion of prestaciones) {
            const prestacionAux: any = new Prestacion(prestacion);
            const registros = prestacionAux.getRegistros(true);
            const registroAlta = registros.find(registro => registro.concepto.conceptId === altaCid);
            if (registroAlta) {
                await SeguimientoPaciente.updateOne(
                    { _id: seguimiento.id },
                    {
                        $set: {
                            ultimoEstado: { clave: 'alta', valor: prestacionAux.estadoActual.createdAt }
                        }
                    }
                );
            }
        }
    }
    done();
}

export = run;
