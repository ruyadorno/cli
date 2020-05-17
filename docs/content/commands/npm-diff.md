---
title: npm-diff
section: 1
description: The registry diff command
---

### Synopsis

```bash
npm diff
npm diff <pkg-name>
npm diff <version-a> [<version-b>]
npm diff <spec-a> [<spec-b>]
```

### Description

Similar to its `git diff` counterpart, this command will print diff patches
of files for packages published to the npm registry.

A variation of different arguments are supported, along with a range of
familiar options from [git diff](https://git-scm.com/docs/git-diff#_options).

* `npm diff <spec-a> <spec-b>`

    Compares two package versions using their registry specifiers, e.g:
    `npm diff foo@1.0.0 foo@^2.0.0`. It's also possible to compare across forks
    of any package, e.g: `npm diff foo@1.0.0 foo-fork@1.0.0`.

    Any valid spec can be used, so that it's also possible to compare
    directories or git repositories, e.g: `npm diff foo@latest ./packages/foo`

* `npm diff` (in a package directory, no arguments):

    If the package is published to the registry, `npm diff` will fetch the
    tarball version tagged as `latest` (this value can be configured using the
    `tag` option) and proceed to compare the contents of files present in that
    tarball, with the current files in your local file system.

    This workflow provides a handy way for package authors to see what
    package-tracked files have been changed in comparison with the latest
    published version of that package.

* `npm diff <version-a> [<version-b>]`

    Using `npm diff` along with semver-valid version numbers is a shorthand
    to compare different versions of the current package. It needs to be run
    from a package directory, such that for a package named `foo` running
    `npm diff 1.0.0 1.0.1` is the same as running
    `npm diff foo@1.0.0 foo@1.0.1`. If only a single argument `<version-a>` is
    provided, then the current local file system is going to be compared
    against that version.

* `npm diff <pkg-name>`

    When using a single package name (with no version or tag specifier) as an
    argument, `npm diff` will work in a similar way to
    [`npm-outdated`](npm-outdated) and reach for the registry to figure out
    what current published version of the package named <pkg-name> will satisfy
    its dependent declared semver-range. Once that specific version is known
    `npm diff` will print diff patches comparing the current version of
    <pkg-name> found in the local file system with that specific version
    returned by the registry.

* `npm diff <spec-a>` (single specifier argument)

    Similar to using only a single package name, it's also possible to declare
    a full registry specifier version if you wish to compare the local version
    of a installed package with the specific version/tag/semver-range provided
    in `<spec-a>`. e.g: (assuming foo@1.0.0 is installed in the current
    `node_modules` folder) running `npm diff foo@2.0.0` will effectively be
    an alias to `npm diff foo@1.0.0 foo@2.0.0`.

#### Filtering files

It's possible to also specify file names or globs pattern matching in order to
limit the result of diff patches to only a subset of files for a given package.

Given the fact that paths are also valid specs, a separator `--` is required
when specifying sets of files to filter in diff. Any extra argument declared
after `--` will be treated as a filenames/globs and diff results will be
limited to files included or matched by those. e.g:

`npm diff foo@2 -- lib/* CHANGELOG.md`

Note: When using `npm diff` with two spec/version arguments, the separator `--`
becomes redudant and can be removed, e.g: `npm diff foo@1.0.0 foo@1.0.1 lib/*`

### Configuration

#### name-only

* Type: Boolean
* Default: false

When set to `true` running `npm diff` only returns the names of the files that
have any difference.

#### unified

* Alias: `-U`
* Type: number
* Default: `3`

The number of lines of context to print in the unified diff format output.

#### ignore-all-space

* Alias: `-w`
* Type: Boolean
* Default: false

Ignore whitespace when comparing lines. This ignores differences even if one
line has whitespace where the other line has none.

#### no-prefix

* Type: Boolean
* Default: false

Do not show any source or destination prefix.

#### src-prefix

* Type: String
* Default: `"a/"`

Show the given source prefix in diff patches headers instead of using "a/".

#### dst-prefix

* Type: String
* Default: `"b/"`

Show the given source prefix in diff patches headers instead of using "b/".

#### text

* Alias: `-a`
* Type: Boolean
* Default: false

Treat all files as text.

#### tag

* Type: String
* Default: `"latest"`

The tag used to fetch the tarball that will be compared with local file system
files when running npm diff with no arguments.


## See Also

* [npm outdated](/commands/npm-outdated)
* [npm install](/commands/npm-install)
* [npm config](/commands/npm-config)
* [npm registry](/using-npm/registry)
