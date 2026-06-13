import fs from 'fs/promises'
import path from 'path'
import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar } from '@/components/nav/sidebar'
import { BackgroundCarousel } from '@/components/background-carousel'
import { ThemeToggle } from '@/components/nav/theme-toggle'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let images: string[] = []
  
  try {
    const dirsToCheck = ['corousal', 'carousal']
    
    for (const dirName of dirsToCheck) {
      const dirPath = path.join(process.cwd(), 'public', dirName)
      try {
        const files = await fs.readdir(dirPath)
        images = files
          .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
          .map((file) => `/${dirName}/${file}`)
        
        if (images.length > 0) break
      } catch (e) {
        // Directory doesn't exist, try the next one
      }
    }
  } catch (e) {
    console.error('Failed to read carousel directories', e)
  }

  return (
    <>
      <BackgroundCarousel images={images} />
      <div className="flex h-dvh relative z-10">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
        <BottomNav className="md:hidden" />
        <ThemeToggle className="fixed top-3 right-3 z-50 md:hidden bg-background/50 backdrop-blur-md border border-border/30" />
      </div>
    </>
  )
}
