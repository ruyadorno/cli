const pacote = require('pacote')

const formatDiff = require('./lib/format-diff.js')
const untar = require('./lib/untar.js')

const diff = async (specs, opts = {}) => {
  const { prefix: path } = opts

  const aManifest = await pacote.manifest(specs.a, opts)

  // when using a single argument the spec to compare from is going to be
  // figured out from reading the current location package
  if (!specs.b)
    specs.b = `file:${path || '.'}`

  const bManifest = await pacote.manifest(specs.b, opts)

  const versions = {
    a: aManifest.version,
    b: bManifest.version,
  }

  // fetches tarball using pacote
  const [a, b] = await Promise.all([
    pacote.tarball(aManifest._resolved, opts),
    pacote.tarball(bManifest._resolved, opts),
  ])

  // read all files
  // populates `files` and `refs`
  const {
    files,
    refs,
  } = await untar([
    {
      prefix: 'a/',
      item: a,
    },
    {
      prefix: 'b/',
      item: b,
    },
  ], opts)

  return formatDiff({
    files,
    opts,
    refs,
    versions,
  })
}

module.exports = diff
