export interface IPacsStudyCandidate {
    uid: string;
    modalities: string[];
}

export interface IPacsReconciliationStatus {
    status: 'uid-exists' | 'reconciled' | 'zero-match' | 'multiple-match';
    checkedAt: Date;
    candidateUIDs?: string[];
}

type Metadata = { key: string; valor: any }[];

const SUPPLEMENTAL_MODALITIES = ['SR'];

export function configuredMatchingModalities(
    configuredModalities: string[] | undefined,
    defaultModality: string
): string[] {
    const modalities = (configuredModalities || [])
        .map(modality => modality.trim())
        .filter(Boolean);
    return modalities.length ? modalities : [defaultModality];
}

export function parseDicomJson(body: any): any[] {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (!Array.isArray(parsed)) {
        throw new Error('Invalid DICOM JSON response');
    }
    return parsed;
}

export function hasDicomResults(body: any): boolean {
    return parseDicomJson(body).length > 0;
}

export function matchingStudies(body: any, allowedModalities: string[]): IPacsStudyCandidate[] {
    const allowed = allowedModalities.map(modality => modality.toUpperCase());
    const studies = parseDicomJson(body);
    const candidates = new Map<string, IPacsStudyCandidate>();

    studies.forEach((study) => {
        const uid = dicomValues(study, '0020000D')[0];
        const modalities = dicomValues(study, '00080061')
            .reduce((all, value) => all.concat(value.split('\\')), [])
            .map(modality => modality.toUpperCase());
        const primaryModalities = modalities.filter(modality => !SUPPLEMENTAL_MODALITIES.includes(modality));

        if (
            uid &&
            primaryModalities.length > 0 &&
            primaryModalities.every(modality => allowed.includes(modality))
        ) {
            candidates.set(uid, { uid, modalities });
        }
    });

    return Array.from(candidates.values());
}

export function reconciledMetadata(metadata: Metadata, currentUID: string, matchedUID: string): Metadata {
    const canonicalUID = metadata.find(item => item.key === 'pacs-canonical-uid')?.valor;
    let next = removeMetadata(metadata, 'pacs-reconciliation');

    next = setMetadata(next, 'pacs-uid', matchedUID);
    if (canonicalUID && canonicalUID === matchedUID) {
        return removeMetadata(next, 'pacs-canonical-uid');
    }
    if (!canonicalUID && currentUID !== matchedUID) {
        next = setMetadata(next, 'pacs-canonical-uid', currentUID);
    }
    return next;
}

export function reconciliationFailureMetadata(
    metadata: Metadata,
    status: IPacsReconciliationStatus
): Metadata {
    return setMetadata(metadata, 'pacs-reconciliation', status);
}

export function resolvedReconciliationMetadata(
    metadata: Metadata,
    status: 'uid-exists' | 'reconciled'
): Metadata {
    return setMetadata(metadata, 'pacs-reconciliation', {
        status,
        checkedAt: new Date()
    });
}

export function isReconciliationResolved(metadata: Metadata): boolean {
    const status = metadata.find(item => item.key === 'pacs-reconciliation')?.valor?.status;
    return status === 'uid-exists' || status === 'reconciled';
}

function dicomValues(study: any, tag: string): string[] {
    const values = study?.[tag]?.Value;
    if (!Array.isArray(values)) {
        return [];
    }
    return values.filter(value => typeof value === 'string');
}

function removeMetadata(metadata: Metadata, key: string): Metadata {
    return metadata
        .filter(item => item.key !== key)
        .map(item => ({ key: item.key, valor: item.valor }));
}

function setMetadata(metadata: Metadata, key: string, valor: any): Metadata {
    return [
        ...removeMetadata(metadata, key),
        { key, valor }
    ];
}
