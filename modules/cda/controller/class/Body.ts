import { IID, ICode, ITemplateId } from './interfaces';

export class Body {
    public components: Component[];

    addComponent (comp) {
        this.components.push(comp);
    }
}


export class Component {
    private id: IID;
    private code: ICode;
    private effectiveTime: Date;
    private templateId: ITemplateId[];

    teplatesId() {
        return this.templateId;
    }

    addTemplateId (root) {
        this.templateId.push({ root });
    }

    getId() {
        return this.id;
    }

    getCode() {
        return this.code;
    }

}
