import * as moment from 'moment';

export class BaseBuilder {

    public createNode(root, tag, attrs, text = null) {
        if (attrs) {
            attrs = JSON.parse(JSON.stringify(attrs));
            return root.ele(tag, attrs);
        } else if (text) {
            return root.ele(tag, {}, text);
        }
    }

    public fromDate(date) {
        const str = moment(date).format('YYYYMMDDhhmmss');
        return str;
    }

}
