import { useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'

/** Taille maximale acceptee pour l'import (5 Mo). */
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif'

type Profile = {
  name?: string
  email?: string
  image?: string
  customImage?: boolean
} | null

/** Initiales de repli a partir du nom (ou de l'e-mail). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * Section « Photo de profil » : avatar courant (grand), import manuel et
 * retrait. La photo est stockee dans `users.image` (source unique de l'avatar).
 * Si un compte Google/GitHub est lie, la photo est synchronisee a chaque
 * connexion tant que l'utilisateur n'a pas importe la sienne (flag custom).
 * Etats geres : loading (skeleton), import en cours (spinner), succes/erreur
 * (toasts). Aucune photo + pas d'import = initiales.
 */
export function ProfilePhotoSection() {
  const me = useQuery(api.users.me, {}) as Profile | undefined
  const generateUploadUrl = useMutation(api.profile.generateUploadUrl)
  const setProfileImage = useMutation(api.profile.setProfileImage)
  const removeProfileImage = useMutation(api.profile.removeProfileImage)

  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)

  if (me === undefined) return <PhotoSkeleton />

  const displayName = me?.name?.trim() || me?.email || m.app_my_account()
  const image = me?.image
  const isCustom = Boolean(me?.customImage)
  const busy = uploading || removing

  function pickFile() {
    inputRef.current?.click()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // On reinitialise tout de suite l'input pour pouvoir re-choisir le meme
    // fichier apres une erreur.
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(m.app_photo_invalid_type())
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(m.app_photo_too_large())
      return
    }

    setUploading(true)
    try {
      const uploadUrl = await generateUploadUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error('upload failed')
      const { storageId } = (await res.json()) as {
        storageId: Id<'_storage'>
      }
      await setProfileImage({ storageId })
      toast.success(m.app_photo_updated())
    } catch {
      toast.error(m.app_photo_upload_error())
    } finally {
      setUploading(false)
    }
  }

  async function onRemove() {
    setRemoving(true)
    try {
      await removeProfileImage({})
      toast.success(m.app_photo_removed())
    } catch {
      toast.error(m.app_photo_remove_error())
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.app_photo_title()}</CardTitle>
        <CardDescription>
          {m.app_photo_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-20 shrink-0">
            {image && <AvatarImage src={image} alt={displayName} />}
            <AvatarFallback className="text-lg">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(e) => void onFileChange(e)}
                aria-hidden
                tabIndex={-1}
              />
              <Button
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={pickFile}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {m.app_photo_upload()}
              </Button>

              {isCustom && (
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void onRemove()}
                >
                  {removing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {m.app_photo_remove()}
                </Button>
              )}
            </div>

            <p className="text-xs text-fg-subtle">
              {isCustom
                ? m.app_photo_hint_custom()
                : m.app_photo_hint_synced()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PhotoSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-11 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
