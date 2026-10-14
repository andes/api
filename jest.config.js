module.exports = {
    testEnvironment: 'node',
    testTimeout: 60000,
    setupFiles: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
    moduleNameMapper: {
        '@andes/unit-test': '<rootDir>/packages/unit-testing/index.ts'
    }
};