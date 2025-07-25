const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/drizzle/', '/telegram-bot/', '/public/', '/logs/', '/storage/', '/backup/'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};