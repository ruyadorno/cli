const { test } = require('tap')
const requireInject = require('require-inject')

const simpleNmFixture = {
  node_modules: {
    'foo': {
      'package.json': JSON.stringify({
        name: 'foo',
        version: '1.0.0',
        dependencies: {
          'bar': '^1.0.0'
        }
      })
    },
    'bar': {
      'package.json': JSON.stringify({
        name: 'bar',
        version: '1.0.0'
      })
    },
    'lorem': {
      'package.json': JSON.stringify({
        name: 'lorem',
        version: '1.0.0'
      })
    }
  }
}

const diffDepTypesNmFixture = {
  node_modules: {
    'dev-dep': {
      'package.json': JSON.stringify({
        name: 'dev-dep',
        version: '1.0.0',
        dependencies: {
          'foo': '^1.0.0'
        }
      })
    },
    'prod-dep': {
      'package.json': JSON.stringify({
        name: 'prod-dep',
        version: '1.0.0',
        dependencies: {
          'bar': '^2.0.0'
        }
      }),
      node_modules: {
        bar: {
          'package.json': JSON.stringify({
            name: 'bar',
            version: '2.0.0'
          })
        }
      }
    },
    'optional-dep': {
      'package.json': JSON.stringify({
        name: 'optional-dep',
        version: '1.0.0'
      })
    },
    'peer-dep': {
      'package.json': JSON.stringify({
        name: 'peer-dep',
        version: '1.0.0'
      })
    },
    ...simpleNmFixture.node_modules
  }
}

let prefix
let result = ''
const _flatOptions = {
  dev: false,
  depth: Infinity,
  only: null,
  json: false,
  production: false
}
const ls = requireInject('../../lib/ls.js', {
  '../../lib/npm.js': {
    flatOptions: _flatOptions,
    limit: {
      fetch: 3
    },
    get dir () { return prefix + '/node_modules/' },
    globalDir: '/foo',
    config: {
      get (key) {
        return _flatOptions[key]
      }
    }
  },
  '../../lib/utils/output.js': msg => { result = msg }
})

const redactCwd = res =>
  res.replace(new RegExp(__dirname, 'g'), '<cwd>')

const jsonParse = res =>
  JSON.parse(redactCwd(res))

test('ls --json', (t) => {
  _flatOptions.json = true
  test('no args', (t) => {
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          lorem: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls([], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          'dependencies': {
            'foo': {
              'version': '1.0.0',
              'dependencies': {
                'bar': {
                  'version': '1.0.0'
                }
              }
            },
            'lorem': {
              'version': '1.0.0'
            }
          }
        },
        'should output json representation of dependencies structure'
      )
      t.end()
    })
  })

  test('missing package.json', (t) => {
    prefix = t.testdir({
      ...simpleNmFixture
    })
    ls([], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          'dependencies': {
            'foo': {
              'version': '1.0.0',
              'dependencies': {
                'bar': {
                  'version': '1.0.0'
                }
              }
            },
            'lorem': {
              'version': '1.0.0'
            }
          }
        },
        'should output json missing name/version of top-level package'
      )
      t.end()
    })
  })

  test('extraneous deps', (t) => {
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls([], (err) => {
      t.equal(
        redactCwd(err),
        'extraneous: lorem@1.0.0 <cwd>/ls-extraneous-deps/node_modules/lorem',
        'should log extraneous dep as error'
      )
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          'problems': [
            'extraneous: lorem@1.0.0 <cwd>/ls-extraneous-deps/node_modules/lorem'
          ],
          'dependencies': {
            'foo': {
              'version': '1.0.0',
              'dependencies': {
                'bar': {
                  'version': '1.0.0'
                }
              }
            },
            'lorem': {
              'version': '1.0.0',
              'extraneous': true,
              'problems': [
                'extraneous: lorem@1.0.0 <cwd>/ls-extraneous-deps/node_modules/lorem'
              ]
            }
          }
        },
        'should output json containing problems info'
      )
      t.end()
    })
  })

  test('with filter arg', (t) => {
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          lorem: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls(['lorem'], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          'dependencies': {
            'lorem': {
              'version': '1.0.0'
            }
          }
        },
        'should output json contaning only occurences of filtered by package'
      )
      t.end()
    })
  })

  test('with missing filter arg', (t) => {
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          lorem: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls(['notadep'], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0'
        },
        'should output json containing no dependencies info'
      )
      t.end()
    })
  })

  test('--depth=0', (t) => {
    _flatOptions.depth = 0
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          lorem: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls([], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          'dependencies': {
            'foo': {
              'version': '1.0.0'
            },
            'lorem': {
              'version': '1.0.0'
            }
          }
        },
        'should output json containing only top-level dependencies'
      )
      _flatOptions.depth = Infinity
      t.end()
    })
  })

  test('--depth=1', (t) => {
    _flatOptions.depth = 1
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          lorem: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls([], (err) => {
      t.ifError(err, 'npm ls')
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          'dependencies': {
            'foo': {
              'version': '1.0.0',
              'dependencies': {
                'bar': {
                  'version': '1.0.0'
                }
              }
            },
            'lorem': {
              'version': '1.0.0'
            }
          }
        },
        'should output json containing top-level deps and their deps only'
      )
      _flatOptions.depth = Infinity
      t.end()
    })
  })

  test('missing/invalid/extraneous', (t) => {
    _flatOptions.depth = 1
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          foo: '^2.0.0',
          ipsum: '^1.0.0'
        }
      }),
      ...simpleNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          'name': 'test-npm-ls',
          'version': '1.0.0',
          'problems': [
            'missing: ipsum@^1.0.0, required by test-npm-ls@1.0.0',
            'invalid: foo@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/foo',
            'extraneous: bar@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/bar',
            'extraneous: lorem@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/lorem'
          ],
          'dependencies': {
            'foo': {
              'version': '1.0.0',
              'invalid': true,
              'problems': [
                'invalid: foo@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/foo',
                'extraneous: bar@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/bar'
              ],
              'dependencies': {
                'bar': {
                  'version': '1.0.0',
                  'extraneous': true,
                  'problems': [
                    'extraneous: bar@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/bar'
                  ]
                }
              }
            },
            'lorem': {
              'version': '1.0.0',
              'extraneous': true,
              'problems': [
                'extraneous: lorem@1.0.0 <cwd>/ls-missing-invalid-extraneous/node_modules/lorem'
              ]
            },
            'ipsum': {
              'required': '^1.0.0',
              'missing': true
            }
          }
        },
        'should output json containing top-level deps and their deps only'
      )
      _flatOptions.depth = Infinity
      t.end()
    })
  })

  test('--dev', (t) => {
    _flatOptions.dev = true
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            'dev-dep': {
              version: '1.0.0',
              dependencies: {
                foo: {
                  version: '1.0.0',
                  dependencies: { bar: { version: '1.0.0' } }
                }
              }
            }
          }
        },
        'should output json containing dev deps'
      )
      _flatOptions.dev = false
      t.end()
    })
  })

  test('--only=development', (t) => {
    _flatOptions.only = 'development'
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            'dev-dep': {
              version: '1.0.0',
              dependencies: {
                foo: {
                  version: '1.0.0',
                  dependencies: { bar: { version: '1.0.0' } }
                }
              }
            }
          }
        },
        'should output json containing only development deps'
      )
      _flatOptions.only = null
      t.end()
    })
  })

  test('--production', (t) => {
    _flatOptions.production = true
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            lorem: { version: '1.0.0' },
            'optional-dep': { version: '1.0.0' },
            'prod-dep': { version: '1.0.0', dependencies: { bar: { version: '2.0.0' } } }
          }
        },
        'should output json containing production deps'
      )
      _flatOptions.production = false
      t.end()
    })
  })

  test('--only=prod', (t) => {
    _flatOptions.only = 'prod'
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            lorem: { version: '1.0.0' },
            'optional-dep': { version: '1.0.0' },
            'prod-dep': { version: '1.0.0', dependencies: { bar: { version: '2.0.0' } } }
          }
        },
        'should output json containing only prod deps'
      )
      _flatOptions.only = null
      t.end()
    })
  })

  test('--long', (t) => {
    _flatOptions.long = true
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            'peer-dep': {
              name: 'peer-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'peer-dep@1.0.0',
              dependencies: {},
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long/node_modules/peer-dep',
              error: null,
              extraneous: true
            },
            'dev-dep': {
              name: 'dev-dep',
              version: '1.0.0',
              dependencies: {
                foo: {
                  name: 'foo',
                  version: '1.0.0',
                  dependencies: {
                    bar: {
                      name: 'bar',
                      version: '1.0.0',
                      readme: 'ERROR: No README data found!',
                      _id: 'bar@1.0.0',
                      dependencies: {},
                      devDependencies: {},
                      optionalDependencies: {},
                      _dependencies: {},
                      path: '<cwd>/ls--long/node_modules/bar',
                      error: '[Circular]',
                      extraneous: false
                    }
                  },
                  readme: 'ERROR: No README data found!',
                  _id: 'foo@1.0.0',
                  devDependencies: {},
                  optionalDependencies: {},
                  _dependencies: { bar: '^1.0.0' },
                  path: '<cwd>/ls--long/node_modules/foo',
                  error: '[Circular]',
                  extraneous: false
                }
              },
              readme: 'ERROR: No README data found!',
              _id: 'dev-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: { foo: '^1.0.0' },
              path: '<cwd>/ls--long/node_modules/dev-dep',
              error: '[Circular]',
              extraneous: false
            },
            lorem: {
              name: 'lorem',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'lorem@1.0.0',
              dependencies: {},
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long/node_modules/lorem',
              error: '[Circular]',
              extraneous: false
            },
            'optional-dep': {
              name: 'optional-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'optional-dep@1.0.0',
              dependencies: {},
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long/node_modules/optional-dep',
              error: '[Circular]',
              extraneous: false
            },
            'prod-dep': {
              name: 'prod-dep',
              version: '1.0.0',
              dependencies: {
                bar: {
                  name: 'bar',
                  version: '2.0.0',
                  readme: 'ERROR: No README data found!',
                  _id: 'bar@2.0.0',
                  dependencies: {},
                  devDependencies: {},
                  optionalDependencies: {},
                  _dependencies: {},
                  path: '<cwd>/ls--long/node_modules/prod-dep/node_modules/bar',
                  error: '[Circular]',
                  extraneous: false
                }
              },
              readme: 'ERROR: No README data found!',
              _id: 'prod-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: { bar: '^2.0.0' },
              path: '<cwd>/ls--long/node_modules/prod-dep',
              error: '[Circular]',
              extraneous: false
            }
          },
          devDependencies: { 'dev-dep': '^1.0.0' },
          optionalDependencies: { 'optional-dep': '^1.0.0' },
          peerDependencies: { 'peer-dep': '^1.0.0' },
          readme: 'ERROR: No README data found!',
          _id: 'test-npm-ls@1.0.0',
          _shrinkwrap: '[Circular]',
          _dependencies: { 'prod-dep': '^1.0.0', lorem: '^1.0.0', 'optional-dep': '^1.0.0' },
          path: '<cwd>/ls--long',
          error: '[Circular]',
          extraneous: false
        },
        'should output long json info'
      )
      _flatOptions.long = true
      t.end()
    })
  })

  test('--long --depth=0', (t) => {
    _flatOptions.depth = 0
    _flatOptions.long = true
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0',
        dependencies: {
          'prod-dep': '^1.0.0',
          'lorem': '^1.0.0'
        },
        devDependencies: {
          'dev-dep': '^1.0.0'
        },
        optionalDependencies: {
          'optional-dep': '^1.0.0'
        },
        peerDependencies: {
          'peer-dep': '^1.0.0'
        }
      }),
      ...diffDepTypesNmFixture
    })
    ls([], () => {
      t.deepEqual(
        jsonParse(result),
        {
          name: 'test-npm-ls',
          version: '1.0.0',
          dependencies: {
            'peer-dep': {
              name: 'peer-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'peer-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long-depth-0/node_modules/peer-dep',
              error: null,
              extraneous: true
            },
            'dev-dep': {
              name: 'dev-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'dev-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: { foo: '^1.0.0' },
              path: '<cwd>/ls--long-depth-0/node_modules/dev-dep',
              error: '[Circular]',
              extraneous: false
            },
            lorem: {
              name: 'lorem',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'lorem@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long-depth-0/node_modules/lorem',
              error: '[Circular]',
              extraneous: false
            },
            'optional-dep': {
              name: 'optional-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'optional-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: {},
              path: '<cwd>/ls--long-depth-0/node_modules/optional-dep',
              error: '[Circular]',
              extraneous: false
            },
            'prod-dep': {
              name: 'prod-dep',
              version: '1.0.0',
              readme: 'ERROR: No README data found!',
              _id: 'prod-dep@1.0.0',
              devDependencies: {},
              optionalDependencies: {},
              _dependencies: { bar: '^2.0.0' },
              path: '<cwd>/ls--long-depth-0/node_modules/prod-dep',
              error: '[Circular]',
              extraneous: false
            }
          },
          devDependencies: { 'dev-dep': '^1.0.0' },
          optionalDependencies: { 'optional-dep': '^1.0.0' },
          peerDependencies: { 'peer-dep': '^1.0.0' },
          readme: 'ERROR: No README data found!',
          _id: 'test-npm-ls@1.0.0',
          _shrinkwrap: '[Circular]',
          _dependencies: { 'prod-dep': '^1.0.0', lorem: '^1.0.0', 'optional-dep': '^1.0.0' },
          path: '<cwd>/ls--long-depth-0',
          error: '[Circular]',
          extraneous: false
        },
        'should output json containing top-level deps in long format'
      )
      _flatOptions.depth = Infinity
      _flatOptions.long = false
      t.end()
    })
  })

  test('no filtered package found', (t) => {
    prefix = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-npm-ls',
        version: '1.0.0'
      })
    })
    ls(['bar'], () => {
      t.deepEqual(
        jsonParse(result),
        { name: 'test-npm-ls', version: '1.0.0' },
        'should print empty json result'
      )
      t.equal(
        process.exitCode,
        1,
        'should exit with error code 1'
      )
      process.exitCode = 0
      t.end()
    })
  })

  t.end()
})

// console.error(require('util').inspect(jsonParse(result), { depth: 10 }))
