
import { isSelected } from './select';
import { assert, expect } from 'chai';


describe('Query Builder - select', () => {

    describe('isSelected', () => {

        it('should return true if field is included', () => {
            const bool = isSelected('nombre apellido', 'nombre');
            assert.equal(bool, true);
        });

        it('should return false if field is not preset', () => {
            const bool = isSelected('nombre apellido', 'ciudad');
            assert.equal(bool, false);
        });

        it('should return true if field is included', () => {
            const bool = isSelected('-nombre -apellido', 'ciudad');
            assert.equal(bool, true);
        });

        it('should return true if field is excluded', () => {
            const bool = isSelected('-nombre -apellido', 'nombre');
            assert.equal(bool, false);
        });

        it('should return true on select null', () => {
            const bool = isSelected('', 'nombre');
            assert.equal(bool, true);

            const bool2 = isSelected(null, 'nombre');
            assert.equal(bool2, true);
        });

    });

});
