import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { PatientBuilder } from './PatientBuilder';
import { AuthorBuilder } from './AuthorBuilder';
import { OrganizationBuilder } from './OrganizationBuilder';
import * as moment from 'moment';

export class BaseBuilder {

    public createNode(root, tag, attrs, text = null) {
        if (attrs) {
            return root.ele(tag, attrs);
        } else if (text) {
            return root.ele(tag, {}, text);
        }
    }

    public fromDate(date) {
        let str = moment(date).format('YYYYMMDDhhmmss');
        return str;
    }

}
