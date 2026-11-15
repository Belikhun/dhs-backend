<p align="center"><img src="https://raw.githubusercontent.com/Belikhun/dhs-frontend/master/assets/img/icon%40128x128.png" width="96" height="96" alt="Deal Hunter Suite logo"></p>

# dhs-backend

The server behind **Deal Hunter Suite**: it checks licences, serves the scripts the extension runs, and hosts the web console used to manage keys and accounts.

## What is here

- `api/`: the endpoints the extension calls. `auth` checks a machine's licence key, `scripts/list`
  and `scripts/fetch` hand out the scripts that licence allows (encrypted for the session),
  `updates/` serves new releases and the changelog, `keys/` and `account/` back the console.
- `data/scripts/`: the scripts themselves, one folder each with a manifest: hunters, voucher
  collectors and deal lists for Tiki, Shopee, Lazada, Sendo and Bách Hóa Xanh. `api.js` documents what a script
  can call.
- `index.php`, `login.php`, `account.php`, `assets/`: the web console.
- `libs/`: my PHP helpers (database, cache, logging, error pages).
- `build/`: the build that obfuscates the scripts and deploys the site.

PHP and MySQL. The database settings in `data/dbinfo.php` belong to a server that no longer
exists; replace them with your own.

## The suite

| Repository | What it is |
| --- | --- |
| [dhs-frontend](https://github.com/Belikhun/dhs-frontend) | the Chrome extension |
| [dhs-backend](https://github.com/Belikhun/dhs-backend) | the licence and script server, with its web console |
| [dhs-proxy](https://github.com/Belikhun/dhs-proxy) | the proxy server that runs on Android phones |
| [dhs-proxy-build](https://github.com/Belikhun/dhs-proxy-build) | compiled builds of the proxy, which phones update from |
| [dhs-archive](https://github.com/Belikhun/dhs-archive) | every packaged release of the extension from 3.0 |

## Status

Deal Hunter Suite was a commercial product from 2019 to early 2022 and is no longer in service.
Its servers are offline, so nothing here runs out of the box, and the marketplace scripts were
written against sites that have changed since. The code is published as it was, for reference.
It is not affiliated with any of the marketplaces it worked on.

More of my work is on [belikhun.dev](https://belikhun.dev).

## Licence

MIT. See [LICENSE](LICENSE).
