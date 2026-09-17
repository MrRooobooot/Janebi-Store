import assert from 'node:assert/strict';
import config from '../../vitest.config.js';

// Config-only check: never open a customer/developer DB, even on RED.
assert.equal(config.test?.env?.DATABASE_URL, ':memory:', 'Vitest must override inherited DATABASE_URL with an ephemeral SQLite DB');
assert.equal(config.test?.globalSetup, undefined, 'Persistent-DB cleanup must not run in the isolated suite');
console.log('PASS: test DB is ephemeral; persistent cleanup is disconnected');
