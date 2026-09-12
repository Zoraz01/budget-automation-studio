import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env"))
  throw new Error(
    ".env already exists; edit it explicitly instead of replacing keys",
  );
const password = randomBytes(24).toString("base64url");
writeFileSync(
  ".env",
  `APP_MODE=personal\nPORT=4310\nBUDGET_CURRENCY=USD\nAPP_PASSWORD=${password}\nVAULT_KEY=${randomBytes(32).toString("hex")}\nPLAID_ENV=sandbox\nAI_PROVIDER=disabled\n`,
  { mode: 0o600, flag: "wx" },
);
console.log("Created a private .env. Your new local login password is:");
console.log(password);
console.log(
  "Save it in your password manager. For cloud or local AI, run npm run setup:ai, then npm start. Keep .env backed up securely.",
);
