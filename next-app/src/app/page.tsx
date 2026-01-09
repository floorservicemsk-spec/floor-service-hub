import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Use getServerSession without options for simple session check
  // This avoids importing auth.ts which has prisma dependency
  const session = await getServerSession();
  
  if (session) {
    redirect("/home");
  } else {
    redirect("/login");
  }
}
