module.exports = {
    roots: ['./'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        "^.+\\.jsx?$": "babel-jest",
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testEnvironment: 'node',
    moduleNameMapper: {
        '@andes/unit-test': '<rootDir>/packages/unit-testing/index.ts'
    }
}