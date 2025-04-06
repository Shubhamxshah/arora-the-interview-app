import React from "react"
import { signIn, auth } from "@/auth"
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SigninComponent = async () => {
  const session = await auth();
  if (!session?.user){
    return (
      <form action = {
        async () => {
          'use server'
          await signIn("google", {redirectTo: "/dashboard"})
        }
      }>
        <Button variant="default" className="bg-blue-600 border-zinc-50 text-white w-32" type="submit"> Get started</Button>
      </form>
    )
  }

  return (
    <>
      <Link href="/dashboard">
        <Button variant="default"> Dashboard </Button>
      </Link>
    </>
  )
}

export default SigninComponent
