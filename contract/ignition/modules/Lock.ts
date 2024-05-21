import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_GWEI: bigint = 1_000_000_000n;

const LockModule = buildModule("LockModule", (m) => {
  const Amount = m.getParameter("Amount", ONE_GWEI);

  const lock = m.contract("Lock", [] , {
    value: Amount,
  });

  return { lock };
});

export default LockModule;
