# ls

## Arguments

- `--json`
- `--long`
- `--parseable`
- `--global`
- `--dev`
- `--production`
- `--only`
- `--link`
- `--depth`
- `--unicode`

## Features

- Filter per package spec, e.g: `npm ls foo bar@1.0.0`
- Silent output
- Signal `peer dep not met:`, `invalid` problems
- Signal `max depth reached: `, `required by`
- Print `UNMET [OPTIONAL] DEPENDENCY` along with color info
- Special handling of type: `alias`
- Signal `deduped` packages
- Signal `invalid`, `peer invalid`, `UNMET PEER DEPENDENCY`, `extraneous`
- Special label when using git `npa` type
- Signal `INVALID` `MISSING` `PEERINVALID` `EXTRANEOUS` packages
- `ENOTDIR` error if not in a valid location
- Print `problems` in json output

