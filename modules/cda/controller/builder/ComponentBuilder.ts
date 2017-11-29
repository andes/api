import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';
import { Component, ImageComponent } from '../class/Body';
import { BaseBuilder } from './BaseBuilder';

export class ComponentBuilder extends BaseBuilder {

    public build(component: Component) {
        let section = builder.create('component').ele('section');

        if (component.Id()) {
            this.createNode(section, 'id', component.Id());
        }

        if (component.title()) {
            this.createNode(section, 'title', null , component.title());
        }

        if (component.code()) {
            this.createNode(section, 'code', component.code());
        }

        if (component.teplatesId().length > 0) {
            component.teplatesId().forEach(item => {
                this.createNode(section, 'templateId', item);
            });
        }

        let text = component.text();
        if (text) {
            if ((text as String).indexOf('<') >= 0) {
                section.ele('text').raw(text);
            } else {
                this.createNode(section, 'text', null, component.text());
            }
        }

        return section;
    }
}

/**
 *   <entry>
 *      <observationMedia classCode='OBS' moodCode='EVN' ID='FIRMA'>
 *      <id root='2.16.840.1.113883.19.2.1'/>
 *          <value xsi:type='ED' mediaType='image/jpeg'>
 *              <reference value="../firmas/0.jpg"/>
 *          </value>
 *          <value representation="B64" mediaType="image/jpeg">
 *              asavqevwevwev
 *          </value>
 *      </observationMedia>
 *   </entry>
 */
export class ImageComponentBuilder extends ComponentBuilder {
    public build(component: ImageComponent) {
        let section = super.build(component);
        section.ele('text').ele('renderMultiMedia', { referencedObject: component.identifier });

        let entry = section.ele('entry');

        let obsAttr = {
            classCode: 'OBS',
            moodCode: 'ENV',
            ID: component.identifier
        };

        // If data is in base64
        if (component.isB64()) {
            let obsTag = entry.ele('observationMedia', obsAttr);
            let valueAttr = {
                representation: 'B64',
                mediaType: component.type()
            };

            obsTag.ele('value', valueAttr, component.file());
        } else {
            // if data is reference to a file
            let obsTag = entry.ele('observationMedia', obsAttr);
            let valueAttr = {
                'xsi:type': 'ED',
                mediaType: component.type()
            };
            let value = obsTag.ele('value', valueAttr);
            value.ele('reference', {value: component.file() });
        }

        return section;
    }
}
