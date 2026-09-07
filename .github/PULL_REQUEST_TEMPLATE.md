**What changed, and why** (one paragraph; link the issue if there is one)



**Checks**

- [ ] `just check` is green locally (Gate A may print SKIPPED; CI runs it)
- [ ] If a doc was added under `docs/`: it carries one status word and is indexed in `docs/README.md`
- [ ] If the JS↔wasm surface changed: `crates/bert-lenses-kernel/API.md` and the fixture in `fixtures/contract/` are updated
- [ ] If a golden changed: the diff was read and the reason is stated above
