import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'

/**
 * Réglages d'organisation (admin) : renommer + zone de danger (suppression).
 * La suppression retire tous les membres mais ne touche aucun pipeline
 * personnel (cf. `convex/organizations.remove`).
 */
export function OrgSettingsCard({
  organizationId,
  name,
}: {
  organizationId: Id<'organizations'>
  name: string
}) {
  const rename = useMutation(api.organizations.rename)
  const removeOrg = useMutation(api.organizations.remove)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty = value.trim().length > 0 && value.trim() !== name

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true)
    try {
      await rename({ organizationId, name: value.trim() })
      toast.success(m.app_changes_saved())
    } catch (err) {
      toast.error(errorMessage(err, m.org_rename_error()))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    setDeleting(true)
    try {
      await removeOrg({ organizationId })
      toast.success(m.org_deleted_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.org_delete_error()))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={onSave}>
          <CardHeader>
            <CardTitle>{m.org_settings_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-rename">{m.org_settings_name_label()}</Label>
              <Input
                id="org-rename"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="sm:max-w-md"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving || !dirty}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {m.app_save()}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">{m.org_delete_title()}</CardTitle>
          <CardDescription>{m.org_delete_description()}</CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-danger hover:text-danger">
                <Trash2 className="size-4" />
                {m.org_delete_button()}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{m.org_delete_confirm_title()}</AlertDialogTitle>
                <AlertDialogDescription>
                  {m.org_delete_confirm_desc()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {m.member_remove_confirm_cancel()}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={deleting}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  {m.org_delete_button()}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}
