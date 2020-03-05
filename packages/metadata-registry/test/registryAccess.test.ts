import { fail } from 'assert';
import { expect } from 'chai';
import * as fs from 'fs';
import { createSandbox, SinonStub } from 'sinon';
import { RegistryAccess } from '../src';
import { META_XML_SUFFIX } from '../src/constants';

const env = createSandbox();

describe('RegistryAccess', () => {
  describe('getTypeFromName', () => {
    const registry = new RegistryAccess({
      types: {
        testtype: { directoryName: 'tests', inFolder: false, name: 'TestType' }
      },
      suffixes: {},
      mixedContent: {}
    });

    it('should fetch type regardless of casing', () => {
      // throws an error if it doesn't exist
      registry.getTypeFromName('TEstTyPE');
    });

    it('should fetch type regardless of spaces', () => {
      registry.getTypeFromName('test type');
    });

    it('should throw an error if definition missing', () => {
      try {
        registry.getTypeFromName('TypeWithNoDefinition');
        fail('should have thrown an error');
      } catch (e) {
        expect(e.message).to.equal(
          'missing metadata type definition for typewithnodefinition'
        );
      }
    });
  });

  describe('getComponentsFromPath', () => {
    const data = {
      types: {
        kathybates: {
          directoryName: 'kathys',
          inFolder: true,
          name: 'KathyBates',
          suffix: 'kathy'
        },
        keanureeves: {
          directoryName: 'keanus',
          inFolder: false,
          name: 'KeanuReeves',
          suffix: 'keanu'
        },
        dwaynejohnson: {
          directoryName: 'dwaynes',
          inFolder: false,
          name: 'DwayneJohnson'
        }
      },
      suffixes: {
        kathy: 'kathybates',
        keanu: 'keanureeves',
        missing: 'typewithoutdef'
      },
      mixedContent: { dwaynes: 'dwaynejohnson' }
    };
    const registry = new RegistryAccess(data);
    let existsStub: SinonStub;

    beforeEach(() => (existsStub = env.stub(fs, 'existsSync')));
    afterEach(() => env.restore());

    it('should throw file not found error if given path does not exist', () => {
      const cmpPath = '/path/to/keanus/MyKeanu.keanu';
      existsStub.withArgs(cmpPath).returns(false);
      try {
        registry.getComponentsFromPath(cmpPath);
        fail(`should have thrown a file not found error`);
      } catch (e) {
        expect(e.message).to.equal(`file not found ${cmpPath}`);
      }
    });

    it('should throw unsupported type error for types missing a suffix', () => {
      const sourcePath = '/path/to/dwaynes/TestDwayne/TestDwayne.js';
      existsStub.withArgs(sourcePath).returns(true);
      try {
        registry.getComponentsFromPath(sourcePath);
        fail('should have thrown an unsupported type error');
      } catch (e) {
        expect(e.message).to.equal(
          'types missing a defined suffix are currently unsupported'
        );
      }
    });

    it('should throw missing type definition error for types without an entry (rare)', () => {
      const xmlPath = '/path/to/missing/TypeDef.missing-meta.xml';
      existsStub.withArgs(xmlPath).returns(true);
      try {
        registry.getComponentsFromPath(xmlPath);
        fail('should have thrown an unsupported type error');
      } catch (e) {
        expect(e.message).to.equal(
          `missing metadata type definition for ${data.suffixes.missing}`
        );
      }
    });

    describe('Types with no mixed content', () => {
      const cmpPath = '/path/to/keanus/MyKeanu.keanu';
      const xmlPath = `${cmpPath}${META_XML_SUFFIX}`;

      it(`should return a component when given a ${META_XML_SUFFIX} file`, () => {
        existsStub.withArgs(cmpPath).returns(false);
        existsStub.withArgs(xmlPath).returns(true);
        expect(registry.getComponentsFromPath(xmlPath)[0]).to.deep.equal({
          fullName: 'MyKeanu',
          type: data.types.keanureeves,
          xmlPath,
          sources: []
        });
      });

      it(`should return a component w/ source file when given a ${META_XML_SUFFIX} file`, () => {
        existsStub.withArgs(cmpPath).returns(true);
        existsStub.withArgs(xmlPath).returns(true);
        expect(registry.getComponentsFromPath(xmlPath)[0]).to.deep.equal({
          fullName: 'MyKeanu',
          type: data.types.keanureeves,
          xmlPath,
          sources: [cmpPath]
        });
      });

      it(`should return a component w/ ${META_XML_SUFFIX} file when given a source path`, () => {
        existsStub.withArgs(cmpPath).returns(true);
        existsStub.withArgs(xmlPath).returns(true);
        expect(registry.getComponentsFromPath(cmpPath)[0]).to.deep.equal({
          fullName: 'MyKeanu',
          type: data.types.keanureeves,
          xmlPath,
          sources: [cmpPath]
        });
      });

      it(`should throw missing ${META_XML_SUFFIX} file error when given a source path and the xml is missing`, () => {
        existsStub.withArgs(cmpPath).returns(true);
        existsStub.withArgs(xmlPath).returns(false);
        try {
          registry.getComponentsFromPath(cmpPath);
          fail(`should have thrown a missing ${META_XML_SUFFIX} file error`);
        } catch (e) {
          expect(e.message).to.equal(
            'metadata xml file missing for MyKeanu.keanu'
          );
        }
      });

      it('should format fullName for folder types correctly', () => {
        const path = '/path/to/kathys/A_Folder/TestKathy.kathy-meta.xml';
        existsStub.withArgs(path).returns(true);
        const cmp = registry.getComponentsFromPath(path)[0];
        expect(cmp.fullName).to.equal('A_Folder/TestKathy');
      });
    });
  });
});