import { EventCore } from '@andes/event-bus';
import { InformeRUP } from '..//descargas/informe-rup/informe-rup';
import { IPrestacion } from '../rup/prestaciones.interface';
import { Prestacion } from '../rup/schemas/prestacion';
import { DICOMInformePDFObject } from './dicom/informe-encode';
import { DICOMPacienteObject } from './dicom/paciente-encode';
import { DICOMPrestacionObject } from './dicom/prestacion-encode';
import { DICOMPaciente, DICOMPrestacion, DICOMInforme, formatDicomDate } from './dicom/dicom.helpers';

export { DICOMPaciente, DICOMPrestacion, DICOMInforme } from './dicom/dicom.helpers';
import { PacsConfigController } from './pacs-config.controller';
import {
    createPaciente,
    createWorkList,
    enviarInforme,
    loginPacs,
    anularPacs,
    searchStudies,
    studyExists
} from './pacs-network';
import { userScheduler } from '../../config.private';
import { IPacsConfig } from './pacs-config.schema';
import { pacsLogs } from './pacs.logs';
import {
    configuredMatchingModalities,
    isReconciliationResolved,
    matchingStudies,
    reconciledMetadata,
    reconciliationFailureMetadata,
    resolvedReconciliationMetadata
} from './pacs-reconciliation';

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
                { key: 'pacs-pacienteIdDicom', valor: dicomPaciente.id },
                { key: 'pacs-pacienteOtherIdDicom', valor: dicomPaciente.pacienteIDtrimmed },
                { key: 'pacs-accessionNumber', valor: dicomPrestacion.accessionNumber }
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
        const metadata = prestacion.metadata;
        const { valor: uid } = metadata.find(item => item.key === 'pacs-uid');
        const { valor: configId } = metadata.find(item => item.key === 'pacs-config');
        const config = await PacsConfigController.findById(configId);
        if (!config) {
            return null;
        }

        const token = await loginPacs(config);
        if (!config.featureFlags?.reconciliarEstudios || isReconciliationResolved(metadata)) {
            return getViewerURL(config, uid, token);
        }

        if (await studyExists(config, uid, token)) {
            pacsLogs.info('getVisualizadorURL.uid-exists', { prestacion: prestacion.id, uid }, userScheduler);
            try {
                await updatePacsMetadata(
                    prestacion,
                    uid,
                    resolvedReconciliationMetadata(metadata, 'uid-exists')
                );
            } catch (err) {
                pacsLogs.error('getVisualizadorURL.save-status', { prestacion: prestacion.id, uid }, err, userScheduler);
            }
            return getViewerURL(config, uid, token);
        }

        const patientID = metadata.find(item => item.key === 'pacs-pacienteIdDicom')?.valor;
        const studyDate = formatDicomDate(prestacion.ejecucion.fecha);
        if (!patientID || !studyDate) {
            throw new Error('Missing patient ID or study date for PACS reconciliation');
        }

        const matchingModalities = configuredMatchingModalities(
            config.reconcileMatchingModalities,
            config.modalidad
        );
        const response = await searchStudies(config, String(patientID), studyDate, token);
        const candidates = matchingStudies(response, matchingModalities);

        if (candidates.length === 1) {
            const matchedUID = candidates[0].uid;
            const reconciled = reconciledMetadata(metadata, uid, matchedUID);
            const nextMetadata = resolvedReconciliationMetadata(reconciled, 'reconciled');
            await updatePacsMetadata(prestacion, uid, nextMetadata);
            pacsLogs.info(
                'getVisualizadorURL.single-match',
                { prestacion: prestacion.id, uid, matchedUID },
                userScheduler
            );
            return getViewerURL(config, matchedUID, token);
        }

        const status = candidates.length === 0 ? 'zero-match' : 'multiple-match';
        const failureMetadata = reconciliationFailureMetadata(metadata, {
            status,
            checkedAt: new Date(),
            candidateUIDs: candidates.length ? candidates.map(candidate => candidate.uid) : undefined
        });
        await updatePacsMetadata(prestacion, uid, failureMetadata);
        pacsLogs.info(
            `getVisualizadorURL.${status}`,
            { prestacion: prestacion.id, uid, candidateUIDs: candidates.map(candidate => candidate.uid) },
            userScheduler
        );
        return null;
    } catch (err) {
        pacsLogs.error('getVisualizadorURL', { prestacion: prestacion.id }, err, userScheduler);
        return null;
    }
}

function getViewerURL(config: IPacsConfig, uid: string, token: string): string {
    return `${config.visualizador_host}/viewer/${uid}/?token=${token}`;
}

async function updatePacsMetadata(prestacion: IPrestacion, currentUID: string, metadata: any[]): Promise<void> {
    const id = (prestacion as any)._id || prestacion.id;
    await Prestacion.updateOne(
        {
            _id: id,
            metadata: {
                $elemMatch: {
                    key: 'pacs-uid',
                    valor: currentUID
                }
            }
        },
        { $set: { metadata } }
    );
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
