const semver = require('semver')
const libdiff = require('libnpmdiff')
const npa = require('npm-package-arg')
const Arborist = require('@npmcli/arborist')
const npmlog = require('npmlog')
const pacote = require('pacote')
const pickManifest = require('npm-pick-manifest')

const npm = require('./npm.js')
const usageUtil = require('./utils/usage.js')
const output = require('./utils/output.js')
const completion = require('./utils/completion/none.js')
const readLocalPkg = require('./utils/read-local-package.js')

const usage = usageUtil(
  'diff',
  'npm diff' +
  '\nnpm diff [--ignore-all-space] [--name-only] [-- <path>...]' +
  '\nnpm diff <pkg-name>' +
  '\nnpm diff <version-a> [<version-b>]' +
  '\nnpm diff <spec-a> [<spec-b>]'
)

const cmd = (args, cb) => diff(args).then(() => cb()).catch(cb)

const diff = async (args) => {
  const [a, b, ...files] = parseArgs(args)
  const specs = await retrieveSpecs([a, b])
  npmlog.info(`diff a:${specs.a} b:${specs.b}`)
  const res = await libdiff(specs, {
    ...npm.flatOptions,
    ...{ diffOpts: {
      files,
      ...getDiffOpts(),
    }},
  })
  return output(res)
}

const parseArgs = (args) => {
  const argv = npm.config.parsedArgv.cooked
  const sep = argv.indexOf('--')

  if (sep > -1) {
    const files = argv.slice(sep + 1)
    const notFiles = argv.slice(0, sep)
    const [a, b] = args.map(arg => notFiles.includes(arg) ? arg : undefined)
    return [a, b, ...files]
  }

  return args
}

const retrieveSpecs = async (args) => {
  const [a, b] = await convertVersionsToSpecs(args)

  if (!a) {
    const spec = await defaultSpec()
    return { a: spec }
  }

  if (!b)
    return await transformSingleSpec(a)

  return { a, b }
}

const convertVersionsToSpecs = (args) =>
  Promise.all(args.map(async arg => {
    if (semver.valid(arg)) {
      let pkgName
      try {
        pkgName = await readLocalPkg()
      } catch (e) {}

      if (!pkgName) {
        throw new Error(
          'Needs to be run from a project dir in order to use versions.\n\n' +
          `Usage:\n${usage}`
        )
      }

      return `${pkgName}@${arg}`
    }
    return arg
  }))

const defaultSpec = async () => {
  let pkgName
  try {
    pkgName = await readLocalPkg()
  } catch (e) {}

  if (!pkgName) {
    throw new Error(
      'Needs multiple arguments to compare or run from a project dir.\n\n' +
      `Usage:\n${usage}`
    )
  }

  return `${pkgName}@${npm.flatOptions.defaultTag}`
}

const transformSingleSpec = async (a) => {
  const spec = npa(a)
  let pkgName

  try {
    pkgName = await readLocalPkg()
  } catch (e) {}

  if (!pkgName) {
    throw new Error(
      'Needs to be run from a project dir in order to use a single package name.\n\n' +
      `Usage:\n${usage}`
    )
  }

  // when using a single package name as arg and it's part of the current
  // install tree, then retrieve the current installed version and compare
  // it against the same value `npm outdated` would suggest you to update to
  if (spec.registry && spec.name !== pkgName) {
    const opts = {
      ...npm.flatOptions,
      path: npm.flatOptions.prefix,
    }
    const arb = new Arborist(opts)
    const actualTree = await arb.loadActual(opts)
    const [node] = [
      ...actualTree.inventory
        .query('name', spec.name)
        .values(),
    ]

    if (!node || !node.name || !node.package || !node.package.version) {
      throw new Error(
        `Package ${a} not found in the current installed tree.\n\n` +
        `Usage:\n${usage}`
      )
    }

    const tryRootNodeSpec = () =>
      (actualTree.edgesOut.get(spec.name) || {}).spec

    const tryAnySpec = () => {
      for (const edge of node.edgesIn)
        return edge.spec
    }

    const aSpec = node.package.version

    // finds what version of the package to compare against, if a exact
    // version or tag was passed than it should use that, otherwise
    // work from the top of the arborist tree to find the original semver
    // range declared in the package that depends on the package.
    let bSpec
    if (spec.rawSpec)
      bSpec = spec.rawSpec
    else {
      const bTargetVersion =
        tryRootNodeSpec()
        || tryAnySpec()
        || `${npm.flatOptions.savePrefix}${node.package.version}`

      // figure out what to compare against,
      // follows same logic to npm outdated "Wanted" results
      const packument = await pacote.packument(spec, {
        ...npm.flatOptions,
        preferOnline: true,
      })
      bSpec = pickManifest(
        packument,
        bTargetVersion,
        { ...npm.flatOptions }
      ).version
    }

    return {
      a: `${spec.name}@${aSpec}`,
      b: `${spec.name}@${bSpec}`,
    }
  }

  return { a }
}

const getDiffOpts = () => ({
  nameOnly: npm.config.get('name-only', 'cli'),
  context: npm.config.get('unified', 'cli') ||
    npm.config.get('U', 'cli'),
  ignoreWhitespace: npm.config.get('ignore-all-space', 'cli') ||
    npm.config.get('w', 'cli'),
  noPrefix: npm.config.get('no-prefix', 'cli'),
  srcPrefix: npm.config.get('src-prefix', 'cli'),
  dstPrefix: npm.config.get('dst-prefix', 'cli'),
  text: npm.config.get('text', 'cli') ||
    npm.config.get('a', 'cli'),
})

module.exports = Object.assign(cmd, { completion, usage })
