import { createInterface } from "node:readline";
import { hashPassword } from "../server/auth.mjs";
console.log(
  "Enter an admin password (minimum 12 characters). Input is hidden.",
);
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});
rl._writeToOutput = () => {};
rl.question("", (password) => {
  rl.close();
  if (password.length < 12) {
    console.error("\nPassword must contain at least 12 characters.");
    process.exitCode = 1;
    return;
  }
  console.log("\nADMIN_PASSWORD_HASH=" + hashPassword(password));
});
