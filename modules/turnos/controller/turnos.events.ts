
import { EventCore } from '@andes/event-bus';
import { Organizacion } from './../../../core/tm/schemas/organizacion';
import moment = require('moment');
import { services } from '../../../services';
import { sisa } from './../../../config.private';
import * as cie10Schema from './../../../core/term/schemas/cie10';

EventCore.on('citas:turno:reportar', async (data) => {
    const servicio = 'sisa-alta-evento-nominal';
    const usuario = sisa.user_snvs;
    const clave = sisa.password_snvs;
    const turno = data.turno;
    const paciente = turno.paciente;
    const organizacion = await Organizacion.findById(data.agenda.organizacion._id);
    const cie10: any = await cie10Schema.model.findOne({ codigo: turno.diagnostico.codificaciones.codificacionAuditoria.codigo});

    const altaEventoCasoNominal = {
        idTipodoc: '1',
        nrodoc: paciente.documento.toString(),
        sexo: paciente.sexo === 'femenino' ? 'F' : (paciente.sexo === 'masculino') ? 'M' : '',
        fechaNacimiento: paciente.fechaNacimiento,
        idGrupoEvento: turno,
        idEvento: cie10.evento,
        idEstablecimientoCarga: organizacion.codigo.sisa,
        fechaPapel: moment(turno.updatedAt).format('DD-MM-YYYY'),
        idClasificacionManualCaso: cie10.clasificacionManualCaso
    };

    const payload = {
        usuario,
        clave,
        altaEventoCasoNominal
    };

    services.get(servicio).exec(payload);
});
