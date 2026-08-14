import { handleHttpRequest } from '../../utils/requestHandler';
import { IPacsConfig } from './pacs-config.schema';
import { searchStudies, studyExists } from './pacs-network';
import {
    configuredMatchingModalities,
    hasDicomResults,
    matchingStudies,
    reconciledMetadata,
    reconciliationFailureMetadata
} from './pacs-reconciliation';

jest.mock('../../utils/requestHandler', () => ({
    handleHttpRequest: jest.fn()
}));

jest.mock('../../services', () => ({
    services: { get: jest.fn() }
}));

const config = {
    host: 'https://pacs.example.org',
    aet: 'PACS',
} as IPacsConfig;

const dicomStudy = (uid: string, modalities: string[]) => ({
    '0020000D': { vr: 'UI', Value: [uid] },
    '00080061': { vr: 'CS', Value: modalities }
});

describe('PACS reconciliation', () => {
    const requestMock = handleHttpRequest as jest.Mock;

    beforeEach(() => requestMock.mockReset());

    test('enables reconciliation by flag and defaults to the configured modality', () => {
        expect(configuredMatchingModalities(false, ['CR', 'DX'], 'CR')).toEqual([]);
        expect(configuredMatchingModalities(true, undefined, 'CT')).toEqual(['CT']);
        expect(configuredMatchingModalities(true, [], 'MR')).toEqual(['MR']);
        expect(configuredMatchingModalities(true, ['CR', 'DX'], 'CR')).toEqual(['CR', 'DX']);
    });

    test('checks study existence with a bounded series lookup', async () => {
        requestMock.mockResolvedValueOnce([200, '[]']);
        await expect(studyExists(config, '1.2.3', 'token')).resolves.toBe(false);

        requestMock.mockResolvedValueOnce([200, JSON.stringify([{ '0020000E': { Value: ['4.5.6'] } }])]);
        await expect(studyExists(config, '1.2.3', 'token')).resolves.toBe(true);

        expect(requestMock).toHaveBeenLastCalledWith(expect.objectContaining({
            method: 'GET',
            url: 'https://pacs.example.org/dcm4chee-arc/aets/PACS/rs/studies/1.2.3/series',
            qs: { limit: 1 }
        }));
    });

    test('searches potential matches only by patient and date', async () => {
        requestMock.mockResolvedValueOnce([200, '[]']);

        await expect(searchStudies(config, 'patient-1', '20260814', 'token')).resolves.toBe('[]');
        expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
            qs: {
                '00100020': 'patient-1',
                '00080020': '20260814'
            }
        }));
    });

    test('requires actual DICOM results even on a successful response', () => {
        expect(hasDicomResults('[]')).toBe(false);
        expect(hasDicomResults(JSON.stringify([dicomStudy('1', ['CR'])]))).toBe(true);
    });

    test('matches equivalent modalities and treats SR as supplemental', () => {
        const response = [
            dicomStudy('cr', ['CR']),
            dicomStudy('dx', ['DX']),
            dicomStudy('ct-sr', ['CT', 'SR']),
            dicomStudy('ct-us', ['CT', 'US']),
            dicomStudy('sr', ['SR'])
        ];

        expect(matchingStudies(response, ['CR', 'DX']).map(study => study.uid)).toEqual(['cr', 'dx']);
        expect(matchingStudies(response, ['CT']).map(study => study.uid)).toEqual(['ct-sr']);
        expect(matchingStudies(response, ['MR'])).toEqual([]);
    });

    test('classifies zero, single and multiple matches by candidate count', () => {
        expect(matchingStudies([], ['CT'])).toHaveLength(0);
        expect(matchingStudies([dicomStudy('one', ['CT'])], ['CT'])).toHaveLength(1);
        expect(matchingStudies([
            dicomStudy('one', ['CT']),
            dicomStudy('two', ['CT'])
        ], ['CT'])).toHaveLength(2);
    });

    test('stores the original MWL UID on first reconciliation', () => {
        const metadata = [
            { key: 'pacs-uid', valor: 'mwl' },
            { key: 'pacs-reconciliation', valor: { status: 'zero-match' } }
        ];
        const next = reconciledMetadata(metadata, 'mwl', 'acquired');

        expect(next.find(item => item.key === 'pacs-uid')?.valor).toBe('acquired');
        expect(next.find(item => item.key === 'old-pacs-uid')?.valor).toBe('mwl');
        expect(next.some(item => item.key === 'pacs-reconciliation')).toBe(false);
    });

    test('preserves the MWL UID through later reconciliations', () => {
        const metadata = [
            { key: 'pacs-uid', valor: 'acquired-1' },
            { key: 'old-pacs-uid', valor: 'mwl' }
        ];
        const next = reconciledMetadata(metadata, 'acquired-1', 'acquired-2');

        expect(next.find(item => item.key === 'pacs-uid')?.valor).toBe('acquired-2');
        expect(next.find(item => item.key === 'old-pacs-uid')?.valor).toBe('mwl');
    });

    test('cleans the old UID after the real PACS merge', () => {
        const metadata = [
            { key: 'pacs-uid', valor: 'acquired' },
            { key: 'old-pacs-uid', valor: 'mwl' }
        ];
        const next = reconciledMetadata(metadata, 'acquired', 'mwl');

        expect(next.find(item => item.key === 'pacs-uid')?.valor).toBe('mwl');
        expect(next.some(item => item.key === 'old-pacs-uid')).toBe(false);
    });

    test('replaces the reconciliation failure marker', () => {
        const checkedAt = new Date();
        const next = reconciliationFailureMetadata(
            [
                { key: 'pacs-uid', valor: 'mwl' },
                { key: 'pacs-reconciliation', valor: { status: 'zero-match' } }
            ],
            {
                status: 'multiple-match',
                checkedAt,
                candidateUIDs: ['one', 'two']
            }
        );

        const statuses = next.filter(item => item.key === 'pacs-reconciliation');
        expect(statuses).toHaveLength(1);
        expect(statuses[0].valor).toEqual({
            status: 'multiple-match',
            checkedAt,
            candidateUIDs: ['one', 'two']
        });
    });
});
