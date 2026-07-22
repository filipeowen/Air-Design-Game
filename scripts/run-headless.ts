import { runHeadlessCampaigns } from "../src/game/simulation/headlessRunner";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const current = process.argv[index];
  const next = process.argv[index + 1];
  if (current?.startsWith("--") && next && !next.startsWith("--")) {
    args.set(current.slice(2), next);
    index += 1;
  }
}

const campaigns = Number(args.get("campaigns") ?? "10");
const months = Number(args.get("months") ?? "120");
const seed = Number(args.get("seed") ?? "1970");

const report = runHeadlessCampaigns(campaigns, months, seed);
console.log(JSON.stringify(report, null, 2));
