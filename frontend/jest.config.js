module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/test_js/setup-jest.js'],
  moduleNameMapper: {
    '^jquery$': '<rootDir>/node_modules/jquery/dist/jquery.js',
    '^handlebars$': '<rootDir>/node_modules/handlebars/dist/handlebars.js',
    '^marked$': '<rootDir>/node_modules/marked/marked.min.js',
    '^micromodal$': '<rootDir>/node_modules/micromodal/dist/micromodal.min.js'
  }
};