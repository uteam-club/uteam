import { updateUser, getUserByEmail } from "@/services/user.service";

async function main() {
  const email = "admin@fdcvista.com";
  const newPassword = "admin123!"; // ваш новый пароль
  const user = await getUserByEmail(email);
  if (!user) {
    console.log("User not found");
    return;
  }
  await updateUser(user.id, { password: newPassword });
  console.log("Password updated!");
}

main().then(() => process.exit()); 