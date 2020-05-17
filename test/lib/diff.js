const t = require('tap')
const requireInject = require('require-inject')

const noop = () => null
const defaultConfigs = () => {
  const conf = new Map([
    ['name-only', false],
  ])
  conf.parsedArgv = { cooked: [] }
  return conf
}
const npm = {
  config: defaultConfigs(),
  flatOptions: {
    defaultTag: 'latest',
    prefix: '',
    savePrefix: '^',
  },
}
const mocks = {
  npmlog: { info: noop },
  libnpmdiff: noop,
  '../../lib/npm.js': npm,
  '../../lib/utils/output.js': noop,
  '../../lib/utils/read-local-package.js': async () => 'foo',
  '../../lib/utils/usage.js': () => 'usage instructions',
}

const defaultOpts = {
  diffOpts: {
    files: [],
    nameOnly: false,
  },
}

t.afterEach(cb => {
  npm.config = defaultConfigs()
  npm.flatOptions.prefix = ''
  cb()
})

t.test('no args', t => {
  t.plan(4)

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@latest', 'should have default spec comparison')
      t.equal(b, undefined, 'should have no b comparison arg')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, defaultOpts, 'should forward default options')
    },
  })

  diff([], err => {
    if (err)
      throw err
  })
})

t.test('no args, missing package.json in cwd', t => {
  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    '../../lib/utils/read-local-package.js': async () => undefined,
  })

  diff([], err => {
    t.match(
      err,
      /Needs multiple arguments to compare or run from a project dir./,
      'should throw EDIFF error msg'
    )
    t.end()
  })
})

t.test('single spec', t => {
  t.plan(4)

  const args = ['foo@1.0.0']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@1.0.0', 'should forward single spec')
      t.equal(b, undefined, 'should have no b comparison arg')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, defaultOpts, 'should forward default options')
    },
  })

  diff(args, err => {
    if (err)
      throw err
  })
})

t.test('both specs', t => {
  t.plan(4)

  const args = ['file:/home/dev/project', 'foo@2.0.0']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'file:/home/dev/project', 'should set expected first spec')
      t.equal(b, 'foo@2.0.0', 'should set expected second spec')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, defaultOpts, 'should forward default options')
    },
  })

  diff(args, err => {
    if (err)
      throw err
  })
})

t.test('single version', t => {
  t.plan(4)

  const args = ['2.1.4']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@2.1.4', 'should convert to expected first spec')
      t.equal(b, undefined, 'should have no b comparison arg')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, defaultOpts, 'should forward default options')
    },
  })

  diff(args, err => {
    if (err)
      throw err
  })
})

t.test('single version, no package.json', t => {
  const args = ['2.1.4']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    '../../lib/utils/read-local-package.js': () => {
      throw new Error('ERR')
    },
  })

  diff(args, err => {
    t.match(
      err,
      /Needs to be run from a project dir in order to use versions./,
      'should throw an error message explaining usage'
    )
    t.end()
  })
})

t.test('multiple versions', t => {
  t.plan(4)

  const args = ['2.1.4', '3.0.0']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@2.1.4', 'should convert to expected first spec')
      t.equal(b, 'foo@3.0.0', 'should convert to expected second spec')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, defaultOpts, 'should forward default options')
    },
  })

  diff(args, err => {
    if (err)
      throw err
  })
})

t.test('using --name-only option', t => {
  t.plan(2)

  npm.config.set('name-only', true)

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, {
        diffOpts: {
          ...defaultOpts.diffOpts,
          nameOnly: true,
        },
      }, 'should forward nameOnly=true option')
    },
  })

  diff([], err => {
    if (err)
      throw err
  })
})

t.test('set files after both versions', t => {
  t.plan(4)

  const args = ['2.1.4', '3.0.0', './foo.js', './bar.js']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@2.1.4', 'should use expected spec')
      t.equal(b, 'foo@3.0.0', 'should use expected spec')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, {
        diffOpts: {
          ...defaultOpts.diffOpts,
          files: [
            './foo.js',
            './bar.js',
          ],
        },
      }, 'should forward all remaining items as filenames')
    },
  })

  diff(args, err => {
    if (err)
      throw err
  })
})

t.test('set files after single version', t => {
  t.plan(4)

  npm.config.parsedArgv.cooked = ['2.1.4', '--', './foo.js', './bar.js']

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@2.1.4', 'should use expected spec')
      t.equal(b, undefined, 'should have no b spec')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, {
        diffOpts: {
          ...defaultOpts.diffOpts,
          files: [
            './foo.js',
            './bar.js',
          ],
        },
      }, 'should forward all remaining items as filenames')
    },
  })

  diff(['2.1.4', './foo.js', './bar.js'], err => {
    if (err)
      throw err
  })
})

t.test('set files no args', t => {
  t.plan(4)

  npm.config.parsedArgv.cooked = ['--', './foo.js', './bar.js']

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'foo@latest', 'should have default spec')
      t.equal(b, undefined, 'should have no b spec')
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, {
        diffOpts: {
          ...defaultOpts.diffOpts,
          files: [
            './foo.js',
            './bar.js',
          ],
        },
      }, 'should forward all remaining items as filenames')
    },
  })

  diff(['./foo.js', './bar.js'], err => {
    if (err)
      throw err
  })
})

t.test('using diff option', t => {
  t.plan(2)

  npm.config.set('unified', 5)
  npm.config.set('ignore-all-space', true)
  npm.config.set('no-prefix', false)
  npm.config.set('src-prefix', 'foo/')
  npm.config.set('dst-prefix', 'bar/')
  npm.config.set('text', true)

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.match(opts, npm.flatOptions, 'should forward flat options')
      t.match(opts, {
        diffOpts: {
          ...defaultOpts.diffOpts,
          context: 5,
          ignoreWhitespace: true,
          noPrefix: false,
          srcPrefix: 'foo/',
          dstPrefix: 'bar/',
          text: true,
        },
      }, 'should forward diff options')
    },
  })

  diff([], err => {
    if (err)
      throw err
  })
})

t.only('transform single direct dep name into spec comparison', t => {
  t.plan(4)

  const path = t.testdir({
    node_modules: {
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '1.0.0',
        }),
      },
    },
    'package.json': JSON.stringify({
      name: 'my-project',
      dependencies: {
        bar: '^1.0.0',
      },
    }),
  })

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    pacote: {
      packument: (spec) => {
        t.equal(spec.name, 'bar', 'should have expected spec name')
      },
    },
    'npm-pick-manifest': (packument, target) => {
      t.equal(target, '^1.0.0', 'should use expected target')
      return { version: '1.8.10' }
    },
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'bar@1.0.0', 'should have current spec')
      t.equal(b, 'bar@1.8.10', 'should have possible semver range spec')
    },
  })

  npm.flatOptions.prefix = path

  diff(['bar'], err => {
    if (err)
      throw err
  })
})

t.test('single dep name, no package.json', t => {
  const args = ['bar']
  npm.config.parsedArgv.cooked = args

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    '../../lib/utils/read-local-package.js': () => {
      throw new Error('ERR')
    },
  })

  diff(args, err => {
    t.match(
      err,
      /Needs to be run from a project dir in order to use a single package name./,
      'should throw an error message explaining usage'
    )
    t.end()
  })
})

t.test('transform single spec into spec comparison', t => {
  t.plan(2)

  const path = t.testdir({
    node_modules: {
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '1.0.0',
        }),
      },
    },
    'package.json': JSON.stringify({
      name: 'my-project',
      dependencies: {
        bar: '^1.0.0',
      },
    }),
  })

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'bar@1.0.0', 'should have current spec')
      t.equal(b, 'bar@2.0.0', 'should have expected comparison spec')
    },
  })

  npm.flatOptions.prefix = path

  diff(['bar@2.0.0'], err => {
    if (err)
      throw err
  })
})

t.test('transform single spec from transitive deps', t => {
  t.plan(4)

  const path = t.testdir({
    node_modules: {
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '1.0.0',
          dependencies: {
            lorem: '^2.0.0',
          },
        }),
      },
      lorem: {
        'package.json': JSON.stringify({
          name: 'lorem',
          version: '2.0.0',
        }),
      },
    },
    'package.json': JSON.stringify({
      name: 'my-project',
      dependencies: {
        bar: '^1.0.0',
      },
    }),
  })

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    pacote: {
      packument: (spec) => {
        t.equal(spec.name, 'lorem', 'should have expected spec name')
      },
    },
    'npm-pick-manifest': (packument, target) => {
      t.equal(target, '^2.0.0', 'should target first semver-range spec found')
      return { version: '2.2.2' }
    },
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'lorem@2.0.0', 'should have current spec')
      t.equal(b, 'lorem@2.2.2', 'should have expected target spec')
    },
  })

  npm.flatOptions.prefix = path

  diff(['lorem'], err => {
    if (err)
      throw err
  })
})

t.test('missing info in local installed pkg', t => {
  const path = t.testdir({
    node_modules: {
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
        }),
      },
    },
    'package.json': JSON.stringify({
      name: 'my-project',
      dependencies: {
        bar: '^1.0.0',
      },
    }),
  })

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'bar@1.0.0', 'should have current spec')
      t.equal(b, 'bar@2.0.0', 'should have expected comparison spec')
    },
  })

  npm.flatOptions.prefix = path

  diff(['bar'], err => {
    t.match(
      err,
      /Package bar not found in the current installed tree./,
      'should throw usage message'
    )
    t.end()
  })
})

t.test('missing any reference spec to compare to', t => {
  t.plan(4)

  const path = t.testdir({
    node_modules: {
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '2.0.0',
        }),
      },
    },
  })

  const diff = requireInject('../../lib/diff.js', {
    ...mocks,
    pacote: {
      packument: (spec) => {
        t.equal(spec.name, 'bar', 'should have expected spec name')
      },
    },
    'npm-pick-manifest': (packument, target) => {
      t.equal(target, '^2.0.0', 'should use expected target')
      return { version: '2.5.10' }
    },
    libnpmdiff: async ({ a, b }, opts) => {
      t.equal(a, 'bar@2.0.0', 'should have current spec')
      t.equal(b, 'bar@2.5.10', 'should have expected target spec')
    },
  })

  npm.flatOptions.prefix = path

  diff(['bar'], err => {
    if (err)
      throw err
  })
})
