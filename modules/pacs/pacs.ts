import { EventCore } from '@andes/event-bus';
import { InformeRUP } from '..//descargas/informe-rup/informe-rup';
import { IPrestacion } from '../rup/prestaciones.interface';
import { Prestacion } from '../rup/schemas/prestacion';
import { DICOMInformePDF } from './dicom/informe-encode';
import { DICOMPaciente } from './dicom/paciente-encode';
import { DICOMPrestacion } from './dicom/prestacion-encode';
import { PacsConfigController } from './pacs-config.controller';
import { createPaciente, createWorkList, enviarInforme, loginPacs, anularPacs } from './pacs-network';

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


            const uniqueID = `${config.ui}.${Date.now()}`;


            const pacienteDICOM = DICOMPaciente(prestacion.paciente);
            const prestacionDICOM = DICOMPrestacion(
                prestacion,
                {
                    aet: config.aet,
                    modality: config.modalidad,
                    ui: uniqueID
                }
            );

            await createPaciente(config, pacienteDICOM, token);
            const response = await createWorkList(config, prestacionDICOM, token);
            const dataResponse = response?.['00400100']?.['Value']?.[0]['00400009']?.['Value']?.[0];
            const spsID = dataResponse || null;

            const query = prestacion.groupId ?
                { groupId: prestacion.groupId } :
                { _id: (prestacion as any)._id };

            const arrayMetadata = [
                { key: 'pacs-uid', valor: uniqueID },
                { key: 'pacs-config', valor: config.id }
            ];
            if (dataResponse) {
                arrayMetadata.push({ key: 'pacs-spsID', valor: spsID }); // id de la orden
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
        // [TODO] Logger
        // console.error(err);
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
        const config = await PacsConfigController.findById(configId);
        if (config) {
            const token = await loginPacs(config);

            const metadata = DICOMInformePDF(prestacion);

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


