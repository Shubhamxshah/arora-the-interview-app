import React from 'react'
import { signOut, auth } from '@/auth'
import { Button } from '../ui/button'
import { LogOut } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { DropdownMenuGroup, DropdownMenuLabel } from '@radix-ui/react-dropdown-menu'

const SignoutComponent = async () => {

  const session = await auth();

  if (!session?.user) {
    redirect("/")
  }
  return (
    <div>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Image 
              src={session.user.image!} 
              width={0} 
              height={0} 
              sizes="20vw" 
              style={{width:"50px", height:"auto"}} 
              className="border-red-50 rounded-full hover:scale-110 cursor-pointer" 
              alt="User" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-36'>
          <DropdownMenuLabel>
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Dark mode
            </DropdownMenuItem>
            <DropdownMenuItem>
              User
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
            <DropdownMenuSeparator />
          <DropdownMenuItem>
          <form 
            action={async () => {
            "use server"
            await signOut({redirectTo: "/"})
          }}
          >
            <Button variant="destructive" className='w-full' type="submit"> <LogOut /> Log Out</Button>
          </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )
}

export default SignoutComponent
