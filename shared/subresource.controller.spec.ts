import { SubresourceController } from './subresource.controller';
import { Model } from 'mongoose';
const sinon = require('sinon');


describe('SubResourceController test', () => {
    let subresource;
    let Modelmock;
    afterEach(() => {
        Modelmock = sinon.mock(new Model());
        subresource = new SubresourceController(Modelmock);

    });
    // it('should make test', () => {
    //     subresource.make({ valor: '299111114' });
    //     sinon.assert();

    // });

});
