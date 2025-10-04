import { ChevronUp, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function FiltersDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4"
        >
          Filters <Plus size={'0.25em'} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Dialog>
          <DialogTrigger>
            <DropdownMenuItem>Route</DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
        <DropdownMenuItem>Distance</DropdownMenuItem>
        <DropdownMenuItem>Status</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
