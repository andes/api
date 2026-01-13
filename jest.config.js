module.exports = {
    testEnvironment: 'node',
    testTimeout: 60000,
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
    moduleNameMapper: {
        '@andes/unit-test': '<rootDir>/packages/unit-testing/index.ts',
        '^mongoose-gridfs$': '<rootDir>/__mocks__/mongoose-gridfs.js'
    }
};
