import { EventCore } from '@andes/event-bus';
import { InformeRUP } from '..//descargas/informe-rup/informe-rup';
import { IPrestacion } from '../rup/prestaciones.interface';
import { Prestacion } from '../rup/schemas/prestacion';
import { DICOMInformePDFObject } from './dicom/informe-encode';
import { DICOMPacienteObject } from './dicom/paciente-encode';
import { DICOMPrestacionObject } from './dicom/prestacion-encode';
import { DICOMPaciente, DICOMPrestacion, DICOMInforme } from './dicom/dicom.helpers';

export { DICOMPaciente, DICOMPrestacion, DICOMInforme } from './dicom/dicom.helpers';
import { PacsConfigController } from './pacs-config.controller';
import { createPaciente, createWorkList, enviarInforme, loginPacs, anularPacs } from './pacs-network';
import { userScheduler } from '../../config.private';
import { IPacsConfig } from './pacs-config.schema';
import { pacsLogs } from './pacs.logs';

export async function syncWorkList(prestacion: IPrestacion) {
    try {
        const hasPacs = !!prestacion.metadata?.find(item => item.key === 'pacs-uid');
        if (hasPacs) {
            return;
        }

        const organizacion = prestacion.ejecucion.organizacion;
        const tipoPrestacion = prestacion.solicitud.tipoPrestacion;

        if (!tipoPrestacion) {
            return;
        }

        const config = await PacsConfigController.getConfig(organizacion.id, tipoPrestacion.conceptId);
        if (config) {
            const token = await loginPacs(config);

            const dicomPaciente = DICOMPaciente(config, prestacion.paciente);
            const pacienteDICOM = DICOMPacienteObject(dicomPaciente);

            const dicomPrestacion = DICOMPrestacion(
                prestacion,
                dicomPaciente.id,
                config
            );
            const prestacionDICOM = DICOMPrestacionObject(dicomPrestacion);


            await createPaciente(config, pacienteDICOM, token);
            const response = await createWorkList(config, prestacionDICOM, token);
            const dataResponse = response?.['00400100']?.['Value']?.[0]['00400009']?.['Value']?.[0];

            const spsID = dataResponse || null;
            pacsLogs.info('syncWorkList', { prestacion: prestacion.id, respuestaPacs: spsID, pacienteDICOM, prestacionDICOM }, userScheduler);
            const query = prestacion.groupId ?
                { groupId: prestacion.groupId } :
                { _id: (prestacion as any)._id };

            const arrayMetadata = [
                { key: 'pacs-uid', valor: dicomPrestacion.uniqueID },
                { key: 'pacs-config', valor: config.id },
                { key: 'pacs-pacienteIdDicom', valor: dicomPaciente.id }
            ];
            if (dataResponse) {
                arrayMetadata.push({ key: 'pacs-spsID', valor: spsID }); // id de la orden
                pacsLogs.info('syncWorkList', { prestacion: prestacion.id, respuestaPacs: arrayMetadata }, userScheduler);
            }
            await Prestacion.update(
                query,
                {
                    $push: {
                        metadata: {
                            $each: arrayMetadata
                        }
                    }
                }
            );
        }
    } catch (err) {
        pacsLogs.error('syncWorkList', { prestacion: prestacion.id }, err, userScheduler);
    }
}

export async function getVisualizadorURL(prestacion: IPrestacion) {
    try {
        const { valor: uid } = prestacion.metadata.find(item => item.key === 'pacs-uid');
        const { valor: configId } = prestacion.metadata.find(item => item.key === 'pacs-config');
        const config = await PacsConfigController.findById(configId);
        if (config) {
            const token = await loginPacs(config);
            const url = `${config.visualizador_host}/viewer/${uid}/?token=${token}`;
            return url;
        }
        return null;
    } catch (err) {
        return null;
    }
}

export async function updateWork(metadata: any, estado: string) {
    try {
        const { valor: uid } = metadata.find(item => item.key === 'pacs-uid');
        const { valor: spsId } = metadata.find(item => item.key === 'pacs-spsID');
        const { valor: configId } = metadata.find(item => item.key === 'pacs-config');
        const config = await PacsConfigController.findById(configId);
        if (config) {
            const token = await loginPacs(config);

            if (estado === 'anular') {
                await anularPacs(config, uid, spsId, token);
            }
        }
        return null;
    } catch (err) {
        return null;
    }
}

export async function sendInformePDF(prestacion: IPrestacion) {
    try {
        const { valor: uid } = prestacion.metadata.find(item => item.key === 'pacs-uid');
        const { valor: configId } = prestacion.metadata.find(item => item.key === 'pacs-config');

        const pacienteIdDicomMeta = prestacion.metadata.find(item => item.key === 'pacs-pacienteIdDicom');

        const config = await PacsConfigController.findById(configId);
        if (config) {
            const dicomPaciente = DICOMPaciente(config, prestacion.paciente);
            if (pacienteIdDicomMeta?.valor) {
                dicomPaciente.id = pacienteIdDicomMeta.valor;
            }
            const token = await loginPacs(config);

            const dicomInforme = DICOMInforme(prestacion, dicomPaciente);
            const metadata = DICOMInformePDFObject(dicomInforme);

            const informe = new InformeRUP(prestacion.id, null, {});
            const fileName = await informe.informe();

            await enviarInforme(config, uid, metadata, fileName, token);

        }
        return null;
    } catch (err) {
        // [TODO] Logger
        // console.error(err);
        return null;
    }
}

EventCore.on('rup:prestacion:ejecucion', (prestacion) => {
    syncWorkList(prestacion);
});

EventCore.on('rup:prestacion:anular', (prestacion) => {
    if (prestacion?.metadata?.length) {
        const estado = 'anular';
        updateWork(prestacion.metadata, estado);
    };
});
