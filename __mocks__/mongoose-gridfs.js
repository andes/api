module.exports = {
    createBucket: () => ({
        readFile: jest.fn(),
        writeFile: jest.fn(),
        deleteFile: jest.fn(),
        find: jest.fn(),
    }),
};
