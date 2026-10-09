# Design sources — 《怪味食堂》 / Oddpot Kitchen

**Rule priority:** GDD v0.2 → Codex MVP handoff v0.1 → GDD 01–04 v0.1 for non-conflicting details.

The definitive planning documents are maintained on Google Drive. Read these before changing gameplay rules.

1. [GDD v0.2 · 跨系统统一设计与审查](https://docs.google.com/document/d/11v9krtznTaHg7xmTBTO08R7lYCjQoLhboNP8V2R9HAU/edit)
2. [Codex MVP 开发交接包 v0.1](https://docs.google.com/document/d/1yw7kLC-Jvh_YcYWHRpoQn9YnuopwRZ_tm1HJxokjMPQ/edit)
3. [GDD 01 · 料理研发与炒锅构筑盘](https://docs.google.com/document/d/1eovH8oubYwxgKmzljy0wxsIQwIgqSkRqbR56LW1FP6s/edit)
4. [GDD 02 · 餐馆经营与菜单 Build](https://docs.google.com/document/d/1s5RPrq1FgR9KotlrSOs9_aQ11GjQsd9hxIe7sn0SAGY/edit)
5. [GDD 03 · 食材探索与 Roguelite](https://docs.google.com/document/d/1yK3UtDK01z2205V34PAA9kJ2AuBAUCQ4dpjsr3ruQn8/edit)
6. [GDD 04 · 厨艺踢馆与长期成长](https://docs.google.com/document/d/1CCvX-pbbIoQxVj4M94GNM_3LTKJSriqzuSLTYOMzk5o/edit)
7. [游戏设计总纲 GDD v0.1 (historical)](https://docs.google.com/document/d/1GRPGWYlLt8A_n-LIqXz5fz0K5wRgZ9Mty3jFeZLxACk/edit)

## Prototype delivery scope
- The project intentionally favors interactive cooking and real restaurant economy over character art and combat presentation.
- `src/` is the editable modular implementation used by `index.html`.
- `standalone.html` is a self-contained fallback for single-file testing.
- Run `npm test` before pushing changes.
- The starter uses JavaScript ES modules for rapid validation; converting to TypeScript is a follow-up rather than pretending it is already TypeScript.
- See README/AGENTS for current known tradeoffs.
