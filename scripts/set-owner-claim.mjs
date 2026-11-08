import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const OWNER_EMAIL = "jdwalrwyy@gmail.com";

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Set GOOGLE_APPLICATION_CREDENTIALS to a trusted Firebase service-account JSON file. Never put that file in the repository or frontend."
    );
  }

  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Set GCLOUD_PROJECT or FIREBASE_PROJECT_ID to the Firebase project ID.");
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  const auth = getAuth();
  const user = await auth.getUserByEmail(OWNER_EMAIL);
  const claims = {
    ...user.customClaims,
    admin: true,
    owner: true,
    role: "owner",
  };

  await auth.setCustomUserClaims(user.uid, claims);

  console.log("Owner custom claims assigned successfully.");
  console.log(`Owner email: ${OWNER_EMAIL}`);
  console.log(`Firebase UID: ${user.uid}`);
  console.log("Claims: admin=true, owner=true, role=owner");
  console.log("The owner must sign out and sign in again (or force-refresh the ID token) for the new claims to appear.");
}

main().catch((error) => {
  console.error("Could not assign owner claims:", error);
  process.exitCode = 1;
});
