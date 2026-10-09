# Agent instructions — 怪味食堂

## Source authority

1. 《怪味食堂》GDD v0.2（priority 1）
2. 《怪味食堂》Codex MVP 开发交接包 v0.1
3. GDD01–04 v0.1 only when not conflicting

## MVP scope

6 ingredients; four standard recipes and one hidden variant; a 3×3 wok, three heat beats, stir/stew; 3-dish menu, 2 synergies, WOK/POT stations, three service waves of 7 orders, safe/risk field decision, one third-night chef challenge, persistent progress. No extra ingredients, cold drinks, expansive combat Build, or extra chef battles until core loop passes player tests.

## Key invariants

- `src/engine.js` is source of truth for stock, cook result, service and challenge scoring. UI never grants coins or ingredients directly.
- Purchased raw materials reduce cash only once; consumption reduces stock and contributes cost estimates but not cash again.
- Challenge on DAY 3 replaces normal service, not in addition to it.
- Manual wok gameplay pauses simulated service time; its order still occupies the same cook duration as automatic preparation.
- Transaction IDs and completed stage state must be persisted and idempotent.
- All recipes, ingredient specs, stations and parameters are centralized in `src/data.js`.

## Next development priorities

1. Run actual iPhone Safari smoke tests and fix mobile interaction issues.
2. Build deterministic exploration with touch-driven player movement, 2 simple hazards, and explicit node settlement while maintaining restaurant demand as main motivation.
3. Add stronger automated UI tests and three-day seed replay.
4. Iterate on wok input based on player feedback before adding art.

## Validation

Run `npm test`; open `index.html` via static web server. This v0.1 is a prototype, not a production build; documented omissions in README remain explicit.